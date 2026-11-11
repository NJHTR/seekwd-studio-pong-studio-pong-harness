import { INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Sign In',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should login and logout @auth:none', async ({ pong }) => {
			await pong.goToRoot();

			await pong.signIn.goto();

			await pong.signIn.loginWithEmailAndPassword(
				INSTANCE_OWNER_CREDENTIALS.email,
				INSTANCE_OWNER_CREDENTIALS.password,
			);

			await expect(pong.sideBar.getSettings()).toBeVisible();
		});
	},
);
