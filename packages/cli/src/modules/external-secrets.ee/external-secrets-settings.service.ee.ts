import { SettingsRepository } from '@pong/db';
import { Service } from '@pong/di';
import { EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING } from '@pong/permissions';

import { RoleService } from '@pong/backend-services';

@Service()
export class ExternalSecretsSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly roleService: RoleService,
	) {}

	async setSystemRolesEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING.key,
				value: enabled.toString(),
				loadOnStartup: true,
			},
			['key'],
		);

		const { roleScopeMap } = EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING;

		for (const [roleSlug, scopes] of Object.entries(roleScopeMap)) {
			if (enabled) {
				await this.roleService.addScopesToRole(roleSlug, scopes);
			} else {
				await this.roleService.removeScopesFromRole(roleSlug, scopes);
			}
		}
	}

	async isSystemRolesEnabled(): Promise<boolean> {
		const rows = await this.settingsRepository.findByKeys([
			EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING.key,
		]);
		const value = rows.find(
			(r) => r.key === EXTERNAL_SECRETS_SYSTEM_ROLES_ENABLED_SETTING.key,
		)?.value;
		return value === 'true';
	}
}
