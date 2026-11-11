import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';
import { Container } from '@pong/di';

@BackendModule({ name: 'sso-saml', licenseFlag: 'feat:saml', instanceTypes: ['main'] })
export class SamlModule implements ModuleInterface {
	async init() {
		await import('./saml.controller.ee.js');

		const { SamlService } = await import('./saml.service.ee.js');
		await Container.get(SamlService).init();
	}
}
