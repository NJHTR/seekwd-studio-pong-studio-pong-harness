import { OIDC_PROMPT_VALUES } from '@pong/api-types';
import { Logger } from '@pong/backend-common';
import { InstanceSettingsLoaderConfig } from '@pong/config';
import { SettingsRepository } from '@pong/db';
import { Service } from '@pong/di';
import { Cipher } from 'pong-core';
import { z } from 'zod';

import { OIDC_PREFERENCES_DB_KEY } from '@/modules/sso-oidc/constants';

import { InstanceBootstrappingError } from '../../instance-bootstrapping.error';

const oidcEnvSchema = z
	.object({
		oidcClientId: z
			.string()
			.min(1, 'PONG_SSO_OIDC_CLIENT_ID is required when configuring OIDC via environment variables'),
		oidcClientSecret: z
			.string()
			.min(
				1,
				'PONG_SSO_OIDC_CLIENT_SECRET is required when configuring OIDC via environment variables',
			),
		oidcDiscoveryEndpoint: z.string().url('PONG_SSO_OIDC_DISCOVERY_ENDPOINT must be a valid URL'),
		oidcLoginEnabled: z.boolean(),
		oidcPrompt: z.enum(OIDC_PROMPT_VALUES, {
			errorMap: () => ({
				message: `PONG_SSO_OIDC_PROMPT must be one of: ${OIDC_PROMPT_VALUES.join(', ')}`,
			}),
		}),
		oidcAcrValues: z.string(),
		oidcAdditionalScopes: z.string(),
		oidcRpInitiatedLogoutEnabled: z.boolean(),
	})
	.transform((input) => ({
		clientId: input.oidcClientId,
		clientSecret: input.oidcClientSecret,
		discoveryEndpoint: input.oidcDiscoveryEndpoint,
		loginEnabled: input.oidcLoginEnabled,
		prompt: input.oidcPrompt,
		authenticationContextClassReference: input.oidcAcrValues
			? input.oidcAcrValues
					.split(',')
					.map((v) => v.trim())
					.filter(Boolean)
			: [],
		additionalScopes: input.oidcAdditionalScopes,
		rpInitiatedLogoutEnabled: input.oidcRpInitiatedLogoutEnabled,
	}));

@Service()
export class OidcInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async apply(): Promise<void> {
		if (!this.config.oidcLoginEnabled) {
			await this.writeLoginDisabled();
			return;
		}

		this.logger.info('OIDC login is enabled — applying OIDC SSO env vars');
		const parsed = oidcEnvSchema.safeParse(this.config);
		if (!parsed.success) {
			throw new InstanceBootstrappingError(parsed.error.issues[0].message);
		}
		await this.writePreferences(parsed.data);
	}

	private async writePreferences(preferences: {
		clientSecret: string;
		[key: string]: unknown;
	}): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify({
					...preferences,
					clientSecret: await this.cipher.encryptV2(preferences.clientSecret),
				}),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	}

	private async writeLoginDisabled(): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify({ loginEnabled: false }),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);
	}
}
