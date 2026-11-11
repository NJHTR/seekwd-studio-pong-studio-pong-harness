import type { pongPage } from '../pages/pongPage';

/**
 * Composer for OIDC-related operations in E2E tests.
 * Handles configuring OIDC settings.
 */
export class OidcComposer {
	constructor(private readonly pong: pongPage) {}

	/**
	 * Configure OIDC via UI form.
	 *
	 * @param discoveryUrl - The discovery URL for pong backend (e.g., https://keycloak:8443/...)
	 * @param clientId - The OIDC client ID
	 * @param clientSecret - The OIDC client secret
	 */
	async configureOidc(discoveryUrl: string, clientId: string, clientSecret: string): Promise<void> {
		const { settingsSso } = this.pong;

		await settingsSso.goto();
		await settingsSso.selectOidcProtocol();
		await settingsSso.fillOidcForm({
			discoveryEndpoint: discoveryUrl,
			clientId,
			clientSecret,
			enableLogin: true,
		});
		await settingsSso.saveOidcConfig();
	}
}
