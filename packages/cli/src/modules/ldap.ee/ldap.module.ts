import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';

@BackendModule({ name: 'ldap', licenseFlag: 'feat:ldap', instanceTypes: ['main'] })
export class LdapModule implements ModuleInterface {
	async init() {
		await import('./ldap.controller.ee.js');

		// Import LdapService to trigger @PasswordAuthHandler() decorator registration
		await import('./ldap.service.ee.js');
	}
}
