import { test, expect } from '../../../fixtures/base';

test.describe(
	'OAuth Credentials',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should create and connect with Google OAuth2', async ({ pong }) => {
			const projectId = await pong.start.fromNewProjectBlankCanvas();
			await pong.navigate.toCredentials(projectId);
			await pong.credentials.emptyListCreateCredentialButton.click();
			await pong.credentials.createCredentialFromCredentialPicker(
				'Google OAuth2 API',
				{
					clientId: 'test-key',
					clientSecret: 'test-secret',
				},
				{ closeDialog: false, skipSave: true },
			);

			const popupPromise = pong.page.waitForEvent('popup');
			await pong.credentials.credentialModal.oauthConnectButton.click();

			// The window opens blank within the click gesture and is navigated to the
			// authorization URL once the backend returns it — wait for that request.
			const popup = await popupPromise;
			const authRequest = await popup.waitForRequest(/accounts\.google\.com/);
			const popupUrl = authRequest.url();
			expect(popupUrl).toContain('accounts.google.com');
			expect(popupUrl).toContain('client_id=test-key');

			await popup.close();

			await pong.page.evaluate(() => {
				const channel = new BroadcastChannel('oauth-callback');
				channel.postMessage('success');
			});

			await expect(pong.credentials.credentialModal.oauthConnectSuccessBanner).toContainText(
				'Account connected',
			);
		});

		test('should connect when the callback notifies via window.opener postMessage', async ({
			pong,
		}) => {
			const projectId = await pong.start.fromNewProjectBlankCanvas();
			await pong.navigate.toCredentials(projectId);
			await pong.credentials.emptyListCreateCredentialButton.click();
			await pong.credentials.createCredentialFromCredentialPicker(
				'Google OAuth2 API',
				{
					clientId: 'test-key',
					clientSecret: 'test-secret',
				},
				{ closeDialog: false, skipSave: true },
			);

			const popupPromise = pong.page.waitForEvent('popup');
			await pong.credentials.credentialModal.oauthConnectButton.click();

			const popup = await popupPromise;
			await popup.close();

			// Embed setups can't use BroadcastChannel (cross-origin). The callback page
			// also notifies the opener via postMessage; simulate that path here.
			await pong.page.evaluate(() => {
				window.dispatchEvent(
					new MessageEvent('message', { data: 'success', origin: window.location.origin }),
				);
			});

			await expect(pong.credentials.credentialModal.oauthConnectSuccessBanner).toContainText(
				'Account connected',
			);
		});
	},
);
