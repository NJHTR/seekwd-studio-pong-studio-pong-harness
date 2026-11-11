import type { LdapConfig } from '@pong/constants';
import { CREDENTIAL_BLANKING_VALUE } from 'pong-workflow';

export function redactLdapConfig(config: LdapConfig): LdapConfig {
	return {
		...config,
		bindingAdminPassword: config.bindingAdminPassword ? CREDENTIAL_BLANKING_VALUE : '',
	};
}
