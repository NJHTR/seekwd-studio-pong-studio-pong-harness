import { test, expect } from '../../../fixtures/base';

test.use({
	capability: 'oidc',
	ignoreHTTPSErrors: true, // Keycloak uses self-signed certs
});

test.describe(
	'OIDC Authentication @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.beforeEach(async ({ pong, api, services }) => {
			const keycloak = services.keycloak;
			await api.enableFeature('oidc');
			await pong.oidcComposer.configureOidc(
				keycloak.internalDiscoveryUrl,
				keycloak.clientId,
				keycloak.clientSecret,
			);

			await pong.sideBar.signOutFromWorkflows();
			await pong.page.waitForURL('/signin');
		});

		test('should configure OIDC and login with Keycloak @auth:owner', async ({ pong, services }) => {
			const keycloak = services.keycloak;
			await pong.signIn.getSsoButton().click();
			await pong.keycloakLogin.login(keycloak.testUser.email, keycloak.testUser.password);

			await expect(pong.page).toHaveURL(/\/(workflow|home)/);
			await expect(pong.sideBar.getSettings()).toBeVisible();
		});

		test('should return to the requested page after SSO login @auth:owner', async ({
			pong,
			services,
		}) => {
			const keycloak = services.keycloak;
			await pong.navigate.toCredentials();
			await expect(pong.page).toHaveURL(/\/signin\?redirect=/);

			await pong.signIn.getSsoButton().click();
			await pong.keycloakLogin.login(keycloak.testUser.email, keycloak.testUser.password);

			await expect(pong.page).toHaveURL(/\/home\/credentials/);
		});
	},
);
