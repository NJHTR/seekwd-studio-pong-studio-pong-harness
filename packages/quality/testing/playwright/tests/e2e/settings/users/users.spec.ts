import { INSTANCE_OWNER_CREDENTIALS } from '../../../../config/test-users';
import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Users Settings',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should prevent non-owners to access UM settings', async ({ pong }) => {
			// This creates a new user in the same context, so the cookies are refreshed and owner is no longer logged in
			await pong.api.users.create();
			await pong.navigate.toUsers();
			await expect.poll(() => pong.page.url()).not.toContain('/settings/users');
		});

		test('should allow instance owner to access UM settings', async ({ pong }) => {
			await pong.navigate.toUsers();
			expect(pong.page.url()).toContain('/settings/users');
		});

		test('should be able to change user role to Admin and back', async ({ pong, api }) => {
			const user = await api.users.create();
			await pong.navigate.toUsers();
			await pong.settingsUsers.search(user.email);
			await pong.settingsUsers.selectAccountType(user.email, 'Admin');
			await expect(pong.settingsUsers.getAccountType(user.email)).toHaveText('Admin');
			await pong.settingsUsers.selectAccountType(user.email, 'Member');
			await expect(pong.settingsUsers.getAccountType(user.email)).toHaveText('Member');
		});

		test('should delete user and their data', async ({ pong, api }) => {
			const user = await api.users.create();
			await pong.navigate.toUsers();
			await pong.page.reload();

			await pong.settingsUsers.search(user.email);
			await expect(pong.settingsUsers.getRow(user.email)).toBeVisible();

			await pong.settingsUsers.clickDeleteUser(user.email);
			await pong.settingsUsers.deleteData();
			await expect(pong.notifications.getNotificationByTitleOrContent('User deleted')).toBeVisible();
		});

		test('should delete user and transfer their data', async ({ pong, api }) => {
			const ownerEmail = INSTANCE_OWNER_CREDENTIALS.email;
			const user = await api.users.create();
			await pong.navigate.toUsers();
			await pong.page.reload();

			await pong.settingsUsers.search(user.email);
			await pong.settingsUsers.getRow(user.email).isVisible();

			await pong.settingsUsers.clickDeleteUser(user.email);
			await pong.settingsUsers.transferData(ownerEmail);
			await expect(pong.notifications.getNotificationByTitleOrContent('User deleted')).toBeVisible();
		});
	},
);
