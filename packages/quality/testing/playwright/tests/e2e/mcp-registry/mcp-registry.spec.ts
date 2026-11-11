import { AGENT_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'mcp-registry' } } });

test.describe(
	'MCP Registry',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('exposes Notion MCP as a tool with hidden connection fields', async ({ pong, api }) => {
			await api.seedMcpRegistry();
			await pong.start.fromBlankCanvas();

			await pong.canvas.addNode(AGENT_NODE_NAME, { closeNDV: true });
			await pong.canvas.addSupplementalNodeToParent('Notion MCP', 'ai_tool', AGENT_NODE_NAME, {
				exactMatch: true,
				subcategory: 'MCP servers',
				exactSubcategory: true,
			});

			await expect(pong.ndv.getParameterInput('endpointUrl')).toBeHidden();
			await expect(pong.ndv.getParameterInput('serverTransport')).toBeHidden();
			await expect(pong.ndv.getParameterInput('authentication')).toBeHidden();

			await expect(pong.ndv.getNodeCredentialsQuickConnectEmptyState()).toBeVisible();
			await expect(pong.ndv.getParameterInput('include')).toBeVisible();
		});
	},
);
