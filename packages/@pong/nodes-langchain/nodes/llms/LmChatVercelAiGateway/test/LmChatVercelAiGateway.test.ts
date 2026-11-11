/* eslint-disable pong-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makePongLlmFailedAttemptHandler, getProxyAgent, aiClientFetch } from '@pong/ai-utilities';
import { createMockExecuteFunction } from 'pong-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'pong-workflow';
import type { Mocked } from 'vitest';

import { LmChatVercelAiGateway } from '../LmChatVercelAiGateway.node';

vi.mock('@langchain/openai');
vi.mock('@pong/ai-utilities');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakePongLlmFailedAttemptHandler = vi.mocked(makePongLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);
const mockedAiClientFetch = vi.mocked(aiClientFetch);

describe('LmChatVercelAiGateway', () => {
	let node: LmChatVercelAiGateway;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Vercel AI Gateway Chat Model',
		typeVersion: 1,
		type: '@pong/nodes-langchain.lmChatVercelAiGateway',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-vercel-key',
			url: 'https://ai-gateway.vercel.sh/v1',
		});
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'openai/gpt-4o';
			if (paramName === 'options') return {};
			return undefined;
		});
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue({});

		mockedMakePongLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as never);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatVercelAiGateway();
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should wire the bounded aiClientFetch into ChatOpenAI', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('vercelAiGatewayApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-vercel-key',
					model: 'openai/gpt-4o',
					configuration: expect.objectContaining({
						fetch: mockedAiClientFetch,
						baseURL: 'https://ai-gateway.vercel.sh/v1',
					}),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});
	});
});
