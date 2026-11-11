import { test, expect } from '../../../fixtures/base';

test.describe(
	'Admin user',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should see same Settings sub menu items as instance owner', async ({ pong }) => {
			await pong.api.setupTest('signin-only', 'owner');
			await pong.settingsPersonal.gotoSettings();

			const ownerMenuItems = await pong.settingsPersonal.getMenuItems().count();

			await pong.api.setupTest('signin-only', 'admin');
			await pong.settingsPersonal.gotoSettings();

			await expect(pong.settingsPersonal.getMenuItems()).toHaveCount(ownerMenuItems);
		});
	},
);
