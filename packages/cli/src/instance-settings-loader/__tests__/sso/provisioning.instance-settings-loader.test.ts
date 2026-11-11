import { ProvisioningConfigDto } from '@pong/api-types';
import type { Logger } from '@pong/backend-common';
import type { GlobalConfig, InstanceSettingsLoaderConfig } from '@pong/config';
import type { SettingsRepository } from '@pong/db';
import { jsonParse } from 'pong-workflow';
import { mock } from 'vitest-mock-extended';

import { ProvisioningInstanceSettingsLoader } from '../../loaders/sso/provisioning.instance-settings-loader';

describe('ProvisioningInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();

	const createGlobalConfig = (scopesUseExpressionMapping = false) =>
		({
			sso: {
				provisioning: {
					scopesName: 'pong',
					scopesInstanceRoleClaimName: 'pong_instance_role',
					scopesProjectsRolesClaimName: 'pong_projects',
					scopesUseExpressionMapping,
				},
			},
		}) as GlobalConfig;

	const createLoader = (
		configOverrides: Partial<InstanceSettingsLoaderConfig> = {},
		scopesUseExpressionMapping = false,
	) => {
		const config = {
			ssoUserRoleProvisioning: 'disabled',
			...configOverrides,
		} as InstanceSettingsLoaderConfig;
		return new ProvisioningInstanceSettingsLoader(
			config,
			createGlobalConfig(scopesUseExpressionMapping),
			settingsRepository,
			logger,
		);
	};

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	it('should throw when ssoUserRoleProvisioning has an invalid value', async () => {
		const loader = createLoader({ ssoUserRoleProvisioning: 'invalid' });

		await expect(loader.apply()).rejects.toThrow('PONG_SSO_USER_ROLE_PROVISIONING must be one of');
	});

	it('should write disabled provisioning config', async () => {
		const loader = createLoader({ ssoUserRoleProvisioning: 'disabled' });

		await loader.apply();

		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			{
				key: 'features.provisioning',
				value: JSON.stringify({
					scopesProvisionInstanceRole: false,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: false,
					scopesName: 'pong',
					scopesInstanceRoleClaimName: 'pong_instance_role',
					scopesProjectsRolesClaimName: 'pong_projects',
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	});

	it('should write instance_role provisioning config', async () => {
		const loader = createLoader({ ssoUserRoleProvisioning: 'instance_role' });

		await loader.apply();

		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			{
				key: 'features.provisioning',
				value: JSON.stringify({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: false,
					scopesUseExpressionMapping: false,
					scopesName: 'pong',
					scopesInstanceRoleClaimName: 'pong_instance_role',
					scopesProjectsRolesClaimName: 'pong_projects',
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	});

	it('should write instance_and_project_roles provisioning config', async () => {
		const loader = createLoader({ ssoUserRoleProvisioning: 'instance_and_project_roles' });

		await loader.apply();

		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			{
				key: 'features.provisioning',
				value: JSON.stringify({
					scopesProvisionInstanceRole: true,
					scopesProvisionProjectRoles: true,
					scopesUseExpressionMapping: false,
					scopesName: 'pong',
					scopesInstanceRoleClaimName: 'pong_instance_role',
					scopesProjectsRolesClaimName: 'pong_projects',
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	});

	describe('PONG_SSO_SCOPES_USE_EXPRESSION_MAPPING', () => {
		// It is the "role mapping method" dropdown: it picks how claims map to the roles the
		// mode provisions, and clears the direct-claim flags because the two are exclusive.
		it.each(['instance_role', 'instance_and_project_roles'] as const)(
			'should select expression mapping for the %s mode',
			async (mode) => {
				const loader = createLoader({ ssoUserRoleProvisioning: mode }, true);

				await loader.apply();

				expect(settingsRepository.upsert).toHaveBeenCalledWith(
					{
						key: 'features.provisioning',
						value: JSON.stringify({
							scopesProvisionInstanceRole: false,
							scopesProvisionProjectRoles: false,
							scopesUseExpressionMapping: true,
							scopesName: 'pong',
							scopesInstanceRoleClaimName: 'pong_instance_role',
							scopesProjectsRolesClaimName: 'pong_projects',
						}),
						loadOnStartup: true,
					},
					{ conflictPaths: ['key'] },
				);
			},
		);

		it('should stay off for the disabled mode, which assigns roles manually', async () => {
			const loader = createLoader({ ssoUserRoleProvisioning: 'disabled' }, true);

			await loader.apply();

			const upsertCall = settingsRepository.upsert.mock.calls[0][0] as { value: string };
			expect(jsonParse(upsertCall.value)).toMatchObject({
				scopesProvisionInstanceRole: false,
				scopesProvisionProjectRoles: false,
				scopesUseExpressionMapping: false,
			});
		});

		it('should warn that it has no effect for the disabled mode', async () => {
			const loader = createLoader({ ssoUserRoleProvisioning: 'disabled' }, true);

			await loader.apply();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('PONG_SSO_SCOPES_USE_EXPRESSION_MAPPING=true has no effect'),
			);
		});

		it('should not warn when the mode provisions roles', async () => {
			const loader = createLoader({ ssoUserRoleProvisioning: 'instance_role' }, true);

			await loader.apply();

			expect(logger.warn).not.toHaveBeenCalled();
		});

		it.each(['disabled', 'instance_role', 'instance_and_project_roles'] as const)(
			'should leave %s untouched when unset',
			async (mode) => {
				const loader = createLoader({ ssoUserRoleProvisioning: mode });

				await loader.apply();

				const upsertCall = settingsRepository.upsert.mock.calls[0][0] as { value: string };
				expect(jsonParse(upsertCall.value)).toMatchObject({ scopesUseExpressionMapping: false });
			},
		);
	});

	describe('persisted value is consumable by ProvisioningConfigDto', () => {
		// The loader writes the row that the provisioning service reads back via
		// ProvisioningConfigDto.parse(). If parse fails the service silently falls
		// back to disabled defaults and IdP role claims are ignored.
		const modes = ['disabled', 'instance_role', 'instance_and_project_roles'] as const;

		it.each(modes)('round-trips for %s', async (mode) => {
			const loader = createLoader({ ssoUserRoleProvisioning: mode });

			await loader.apply();

			const upsertCall = settingsRepository.upsert.mock.calls[0][0] as { value: string };
			const persisted = jsonParse<unknown>(upsertCall.value);

			expect(() => ProvisioningConfigDto.parse(persisted)).not.toThrow();
		});

		it.each(modes)('round-trips for %s with expression mapping', async (mode) => {
			const loader = createLoader({ ssoUserRoleProvisioning: mode }, true);

			await loader.apply();

			const upsertCall = settingsRepository.upsert.mock.calls[0][0] as { value: string };
			const persisted = jsonParse<unknown>(upsertCall.value);

			expect(() => ProvisioningConfigDto.parse(persisted)).not.toThrow();
		});
	});
});
