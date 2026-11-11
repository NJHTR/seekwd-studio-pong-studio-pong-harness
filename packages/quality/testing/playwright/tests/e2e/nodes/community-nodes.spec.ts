import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';
import customCredential from '../../../workflows/Custom_credential.json';
import customNodeFixture from '../../../workflows/Custom_node.json';
import customNodeWithCustomCredentialFixture from '../../../workflows/Custom_node_custom_credential.json';
import customNodeWithPongCredentialFixture from '../../../workflows/Custom_node_pong_credential.json';

const CUSTOM_NODE_NAME = 'E2E Node';
const CUSTOM_NODE_WITH_PONG_CREDENTIAL = 'E2E Node with native pong credential';
const CUSTOM_NODE_WITH_CUSTOM_CREDENTIAL = 'E2E Node with custom credential';

test.describe(
	'Community and custom nodes in canvas',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.page.route('/types/nodes.json', async (route) => {
				const response = await route.fetch();
				const nodes = await response.json();
				nodes.push(
					customNodeFixture,
					customNodeWithPongCredentialFixture,
					customNodeWithCustomCredentialFixture,
				);
				await route.fulfill({
					response,
					json: nodes,
					headers: { 'cache-control': 'no-cache, no-store' },
				});
			});

			await pong.page.route('/types/credentials.json', async (route) => {
				const response = await route.fetch();
				const credentials = await response.json();
				credentials.push(customCredential);
				await route.fulfill({
					response,
					json: credentials,
					headers: { 'cache-control': 'no-cache, no-store' },
				});
			});

			await pong.page.route('/community-node-types', async (route) => {
				await route.fulfill({ status: 200, json: { data: [] } });
			});

			await pong.page.route('**/community-node-types/*', async (route) => {
				await route.fulfill({ status: 200, json: null });
			});

			await pong.page.route('https://registry.npmjs.org/*', async (route) => {
				await route.fulfill({ status: 404, json: {} });
			});
		});

		test('should render and select community node', async ({ pong }) => {
			await pong.start.fromBlankCanvas();

			await pong.canvas.clickCanvasPlusButton();
			await pong.canvas.fillNodeCreatorSearchBar(CUSTOM_NODE_NAME);
			await pong.canvas.clickNodeCreatorItemName(CUSTOM_NODE_NAME);
			await pong.canvas.clickAddToWorkflowButton();

			await expect(pong.ndv.getNodeParameters()).toBeVisible();

			await expect(pong.ndv.getParameterInputField('testProp')).toHaveValue('Some default');
			await expect(pong.ndv.getParameterInputField('resource')).toHaveValue('option2');

			await pong.ndv.selectOptionInParameterDropdown('resource', 'option4');
			await expect(pong.ndv.getParameterInputField('resource')).toHaveValue('option4');
		});

		test('should render custom node with pong credential', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

			await pong.canvas.clickNodeCreatorPlusButton();
			await pong.canvas.fillNodeCreatorSearchBar(CUSTOM_NODE_WITH_PONG_CREDENTIAL);
			await pong.canvas.clickNodeCreatorItemName(CUSTOM_NODE_WITH_PONG_CREDENTIAL);
			await pong.canvas.clickAddToWorkflowButton();

			await pong.ndv.clickCreateNewCredential();

			await expect(pong.canvas.credentialModal.container).toContainText('Notion API');
		});

		test('should render custom node with custom credential', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);

			await pong.canvas.clickNodeCreatorPlusButton();
			await pong.canvas.fillNodeCreatorSearchBar(CUSTOM_NODE_WITH_CUSTOM_CREDENTIAL);
			await pong.canvas.clickNodeCreatorItemName(CUSTOM_NODE_WITH_CUSTOM_CREDENTIAL);
			await pong.canvas.clickAddToWorkflowButton();

			await pong.ndv.clickCreateNewCredential();

			await expect(pong.canvas.credentialModal.container).toContainText('Custom E2E Credential');
		});
	},
);
