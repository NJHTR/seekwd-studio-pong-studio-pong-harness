import { mock } from 'vitest-mock-extended';
import { AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES } from '@pong/api-types';

import type { NodeCatalogService } from '@/node-catalog';

import {
	isAgentToolNodeType,
	isExecutableNodeType,
	AgentsToolsService,
} from '../agents-tools.service';

function makeService() {
	const nodeCatalogService = mock<NodeCatalogService>();
	nodeCatalogService.searchNodes.mockResolvedValue({
		results: 'search-result',
		queriesWithNoResults: [],
	});
	nodeCatalogService.getNodeTypes.mockResolvedValue('node-types-string');

	const service = new AgentsToolsService(nodeCatalogService);

	return { service, nodeCatalogService };
}

describe('AgentsToolsService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('searchAgentToolNodes()', () => {
		it('initializes and searches the catalog with the agent tool-node filter', async () => {
			const { service, nodeCatalogService } = makeService();

			const result = await service.searchAgentToolNodes(['gmail', 'slack']);

			expect(nodeCatalogService.initialize).toHaveBeenCalled();
			expect(nodeCatalogService.searchNodes).toHaveBeenCalledWith(['gmail', 'slack'], {
				nodeFilter: isAgentToolNodeType,
			});
			expect(result).toEqual({
				results: 'search-result',
				queriesWithNoResults: [],
			});
		});
	});

	describe('isExecutableNodeType', () => {
		it('rejects trigger nodes only', () => {
			expect(isExecutableNodeType('pong-nodes-base.scheduleTrigger')).toBe(false);
			expect(isExecutableNodeType('pong-nodes-base.httpRequest')).toBe(true);
			expect(isExecutableNodeType('pong-nodes-base.httpRequestTool')).toBe(true);
		});
	});

	describe('isAgentToolNodeType', () => {
		it('allows tool node IDs and rejects base, trigger, or HITL tool node IDs', () => {
			expect(isAgentToolNodeType('pong-nodes-base.scheduleTrigger')).toBe(false);
			expect(isAgentToolNodeType('pong-nodes-base.httpRequest')).toBe(false);
			expect(isAgentToolNodeType('pong-nodes-base.httpRequestTool')).toBe(true);
			expect(isAgentToolNodeType('pong-nodes-base.slackHitlTool')).toBe(false);
		});

		it('rejects non-provider langchain nodes that are not tool types', () => {
			// Non-provider langchain nodes stay excluded.
			expect(isAgentToolNodeType('@pong/nodes-langchain.lmChatOpenAi')).toBe(false);
			expect(isAgentToolNodeType('@pong/nodes-langchain.agent')).toBe(false);
		});

		it('rejects hidden agent-builder tool node IDs', () => {
			for (const nodeType of AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES) {
				expect(isAgentToolNodeType(nodeType)).toBe(false);
			}
		});

		it('does not allow MCP tool nodes', () => {
			expect(isAgentToolNodeType('@pong/nodes-langchain.mcpClientTool')).toBe(false);
			expect(isAgentToolNodeType('@pong/mcp-registry.notion')).toBe(false);
		});
	});
});
