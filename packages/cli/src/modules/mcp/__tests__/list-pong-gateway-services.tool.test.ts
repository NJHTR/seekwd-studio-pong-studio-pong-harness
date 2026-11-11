import type { AiGatewayConfigDto } from '@pong/api-types';
import { mockInstance } from '@pong/backend-test-utils';
import { User } from '@pong/db';
import { mock } from 'vitest-mock-extended';

import type { AiGatewayService } from '@/services/ai-gateway.service';
import { Telemetry } from '@/telemetry';

import { createListPongGatewayServicesTool } from '../tools/list-pong-gateway-services.tool';

const user = Object.assign(new User(), { id: 'user-1' });

const fullConfig: AiGatewayConfigDto = {
	nodes: ['@pong/nodes-langchain.openAi', '@pong/nodes-langchain.lmChatOpenAi'],
	credentialTypes: ['openAiApi'],
	providerConfig: {
		openAiApi: { gatewayPath: '/v1/gateway/openai/v1', urlField: 'url', apiKeyField: 'apiKey' },
	},
	supportedActions: {
		'@pong/nodes-langchain.openAi': {
			text: ['message', 'response'],
		},
	},
	minNodeTypeVersion: { '@pong/nodes-langchain.openAi': 1.2 },
	hiddenNodeProperties: { '@pong/nodes-langchain.openAi': ['baseURL'] },
} as AiGatewayConfigDto;

function makeMocks(opts: { available?: boolean; config?: AiGatewayConfigDto } = {}) {
	const aiGatewayService = mock<AiGatewayService>();
	if (opts.available === false) {
		aiGatewayService.isAvailable.mockResolvedValue({ available: false });
	} else {
		aiGatewayService.isAvailable.mockResolvedValue({
			available: true,
			config: opts.config ?? fullConfig,
		});
	}
	const telemetry = mockInstance(Telemetry, { track: vi.fn() });
	return { aiGatewayService, telemetry };
}

describe('list_pong_gateway_services MCP tool', () => {
	test('registers under the name list_pong_gateway_services', () => {
		const { aiGatewayService, telemetry } = makeMocks();
		const tool = createListPongGatewayServicesTool(user, aiGatewayService, telemetry);
		expect(tool.name).toBe('list_pong_gateway_services');
		expect(tool.config.annotations).toMatchObject({
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		});
	});

	test('returns full coverage payload when available', async () => {
		const { aiGatewayService, telemetry } = makeMocks({ available: true });
		const tool = createListPongGatewayServicesTool(user, aiGatewayService, telemetry);
		const result = await tool.handler({}, {} as never);
		expect(result.structuredContent).toEqual({
			available: true,
			credentialTypes: ['openAiApi'],
			nodes: ['@pong/nodes-langchain.openAi', '@pong/nodes-langchain.lmChatOpenAi'],
			supportedActions: {
				'@pong/nodes-langchain.openAi': { text: ['message', 'response'] },
			},
			minNodeTypeVersion: { '@pong/nodes-langchain.openAi': 1.2 },
			hiddenNodeProperties: { '@pong/nodes-langchain.openAi': ['baseURL'] },
		});
	});

	test('returns { available: false } when unavailable', async () => {
		const { aiGatewayService, telemetry } = makeMocks({ available: false });
		const tool = createListPongGatewayServicesTool(user, aiGatewayService, telemetry);
		const result = await tool.handler({}, {} as never);
		expect(result.structuredContent).toEqual({ available: false });
	});

	test('emits USER_CALLED_MCP_TOOL_EVENT with tool_name and success', async () => {
		const { aiGatewayService, telemetry } = makeMocks();
		const tool = createListPongGatewayServicesTool(user, aiGatewayService, telemetry);
		await tool.handler({}, {} as never);
		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'list_pong_gateway_services',
				results: { success: true, data: { available: true } },
			}),
		);
	});
});
