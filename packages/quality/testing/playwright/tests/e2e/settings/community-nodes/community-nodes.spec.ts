import { test, expect } from '../../../../fixtures/base';

const MOCK_PACKAGE = {
	createdAt: '2024-07-22T19:08:06.505Z',
	updatedAt: '2024-07-22T19:08:06.505Z',
	packageName: 'pong-nodes-chatwork',
	installedVersion: '1.0.0',
	authorName: null,
	authorEmail: null,
	installedNodes: [
		{
			name: 'Chatwork',
			type: 'pong-nodes-chatwork.chatwork',
			latestVersion: 1,
		},
	],
	updateAvailable: '1.1.2',
};

test.describe(
	'Community nodes management',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test('can install, update and uninstall community nodes', async ({ pong }) => {
			await pong.page.route('**/api.npms.io/v2/search*', async (route) => {
				await route.fulfill({ status: 200, json: {} });
			});

			await pong.page.route('/rest/community-packages', async (route) => {
				if (route.request().method() === 'GET') {
					await route.fulfill({ status: 200, json: { data: [] } });
				}
			});

			await pong.navigate.toCommunityNodes();

			await pong.page.route('/rest/community-packages', async (route) => {
				if (route.request().method() === 'POST') {
					await route.fulfill({ status: 200, json: { data: MOCK_PACKAGE } });
				} else if (route.request().method() === 'GET') {
					await route.fulfill({ status: 200, json: { data: [MOCK_PACKAGE] } });
				}
			});

			await pong.communityNodes.installPackage('pong-nodes-chatwork@1.0.0');
			await expect(pong.communityNodes.getCommunityCards()).toHaveCount(1);
			await expect(pong.communityNodes.getCommunityCards().first()).toContainText('v1.0.0');

			const updatedPackage = {
				...MOCK_PACKAGE,
				installedVersion: '1.2.0',
				updateAvailable: undefined,
			};
			await pong.page.route('/rest/community-packages', async (route) => {
				if (route.request().method() === 'PATCH') {
					await route.fulfill({ status: 200, json: { data: updatedPackage } });
				}
			});

			await pong.communityNodes.updatePackage();
			await expect(pong.communityNodes.getCommunityCards()).toHaveCount(1);
			await expect(pong.communityNodes.getCommunityCards().first()).not.toContainText('v1.0.0');

			await pong.page.route('/rest/community-packages*', async (route) => {
				if (route.request().method() === 'DELETE') {
					await route.fulfill({ status: 204 });
				}
			});

			await pong.communityNodes.uninstallPackage();
			await expect(pong.communityNodes.getEmptyState()).toBeVisible();
		});
	},
);
