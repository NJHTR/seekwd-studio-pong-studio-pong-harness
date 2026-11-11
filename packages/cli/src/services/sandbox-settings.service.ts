import type { InstanceAiSandboxProvider } from '@pong/api-types';
import {
	normalizeSandboxProvider as normalizeRuntimeSandboxProvider,
	type DaytonaSandboxConfig,
} from '@pong/agents/sandbox';
import { Logger } from '@pong/backend-common';
import { GlobalConfig } from '@pong/config';
import type { AgentsConfig, DeploymentConfig, InstanceAiConfig } from '@pong/config';
import type { OperationContext } from '@pong/db';
import { Service } from '@pong/di';
import { ensureError } from '@pong/utils/errors/ensure-error';
import type { ICredentialDataDecryptedObject } from 'pong-workflow';
import { nanoid } from 'nanoid';

import {
	InstanceCredentialBroker,
	type InstanceCredentialUse,
	type ResolvedInstanceCredential,
} from '@/credentials/instance-credential-broker';
import { UnprocessableRequestError, OperationalError } from '@pong/errors';

import { AiService } from './ai.service';
import { callAiServiceWithRetry } from '@/utils/ai-service-retry';

const PONG_SANDBOX_HEADER_NAME = 'x-api-key';

type SandboxCredential = {
	type: string;
	data: ICredentialDataDecryptedObject;
};

function requireConnectionValue(
	type: string,
	data: ICredentialDataDecryptedObject,
	field: string,
): string {
	const value = data[field];
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new UnprocessableRequestError(
			`The field "${field}" is required for provider connection type "${type}"`,
		);
	}
	return value.trim();
}

function requireHttpUrl(type: string, data: ICredentialDataDecryptedObject, field: string): string {
	const value = requireConnectionValue(type, data, field);
	try {
		const url = new URL(value);
		if (url.protocol === 'http:' || url.protocol === 'https:') return value;
	} catch {}
	throw new UnprocessableRequestError(
		`The field "${field}" must be a valid HTTP URL for provider connection type "${type}"`,
	);
}

function parseSandboxServiceCredential({ type, data }: SandboxCredential): string {
	const headerName = requireConnectionValue(type, data, 'name').toLowerCase();
	if (headerName !== PONG_SANDBOX_HEADER_NAME) {
		throw new UnprocessableRequestError(
			`The credential's header name must be "${PONG_SANDBOX_HEADER_NAME}" but is "${headerName}"`,
		);
	}
	return requireConnectionValue(type, data, 'value');
}

function parseDaytonaCredential({ type, data }: SandboxCredential): {
	apiUrl: string;
	apiKey: string;
} {
	return {
		apiUrl: requireHttpUrl(type, data, 'apiUrl'),
		apiKey: requireConnectionValue(type, data, 'apiKey'),
	};
}

export const INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY: InstanceCredentialUse = {
	id: 'instance-ai:sandbox:daytona',
	credentialTypes: ['daytonaApi'],
	validate: parseDaytonaCredential,
};

export const INSTANCE_AI_PONG_SANDBOX_CREDENTIAL_POLICY: InstanceCredentialUse = {
	id: 'instance-ai:sandbox:pong',
	credentialTypes: ['httpHeaderAuth'],
	validate: parseSandboxServiceCredential,
};

@Service()
export class SandboxSettingsService {
	private readonly config: InstanceAiConfig;

	private readonly agentsConfig: AgentsConfig;

	private readonly deploymentConfig: DeploymentConfig;

	private credentialUsesRegistered = false;

	constructor(
		globalConfig: GlobalConfig,
		private readonly instanceCredentialBroker: InstanceCredentialBroker,
		private readonly logger: Logger,
		private readonly aiService: AiService,
	) {
		this.config = globalConfig.instanceAi;
		this.agentsConfig = globalConfig.agents;
		this.deploymentConfig = globalConfig.deployment;
		this.config.sandboxProvider = this.getProvider();
	}

	isAgentSandboxEnabled(): boolean {
		return this.agentsConfig.sandboxEnabled || this.config.sandboxEnabled;
	}

	getProvider(): InstanceAiSandboxProvider {
		return normalizeRuntimeSandboxProvider(this.config.sandboxProvider);
	}

	registerCredentialUses(): void {
		if (this.credentialUsesRegistered) return;
		this.instanceCredentialBroker.registerUse(INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY);
		this.instanceCredentialBroker.registerUse(INSTANCE_AI_PONG_SANDBOX_CREDENTIAL_POLICY);
		this.credentialUsesRegistered = true;
	}

	async resolveDaytonaSandboxConfig(
		projectId: string,
		options: Pick<DaytonaSandboxConfig, 'image' | 'snapshot'> & { fallbackSnapshot?: string },
	): Promise<
		Pick<
			DaytonaSandboxConfig,
			'daytonaApiUrl' | 'daytonaApiKey' | 'image' | 'snapshot' | 'getAuthToken'
		>
	> {
		const snapshot = options.snapshot?.trim() || undefined;
		if (!this.aiService.isProxyEnabled()) {
			const credentials = await this.resolveDaytonaConfig();
			return {
				daytonaApiUrl: credentials.apiUrl,
				daytonaApiKey: credentials.apiKey,
				image: options.image,
				snapshot,
			};
		}

		const proxySnapshot = snapshot || options.fallbackSnapshot?.trim() || undefined;
		if (!proxySnapshot) {
			throw new OperationalError(
				'The Daytona proxy requires a sandbox snapshot. For Agent sandboxes, set PONG_AGENTS_AI_SANDBOX_SNAPSHOT. For app builds, set PONG_INSTANCE_AI_SANDBOX_SNAPSHOT.',
			);
		}
		const client = await this.aiService.getClient();
		return {
			daytonaApiUrl: client.getSandboxProxyBaseUrl(),
			snapshot: proxySnapshot,
			getAuthToken: async () => {
				const token = await callAiServiceWithRetry(
					'Sandbox proxy token mint',
					async () =>
						await client.getBuilderApiProxyToken({ id: projectId }, { userMessageId: nanoid() }),
					this.logger,
				);
				return token.accessToken;
			},
		};
	}

	async resolveDaytonaConfig(): Promise<{ apiUrl?: string; apiKey?: string }> {
		const { daytonaApiUrl, daytonaApiKey } = this.config;
		const envConfig = {
			apiUrl: daytonaApiUrl || undefined,
			apiKey: daytonaApiKey || undefined,
		};
		const resolved = await this.resolveServiceCredential(
			INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
			'Daytona sandbox',
		);
		if (!resolved) return envConfig;
		try {
			return parseDaytonaCredential(resolved);
		} catch (error) {
			this.warnCredentialFallback(
				'Daytona sandbox',
				INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY.id,
				ensureError(error).message,
			);
			return envConfig;
		}
	}

	async resolvePongSandboxConfig(
		ctx?: OperationContext,
	): Promise<{ serviceUrl?: string; apiKey?: string }> {
		const { pongSandboxServiceUrl, pongSandboxServiceApiKey } = this.config;
		const envConfig = {
			serviceUrl: pongSandboxServiceUrl || undefined,
			apiKey: pongSandboxServiceApiKey || undefined,
		};
		const resolved = await this.resolveServiceCredential(
			INSTANCE_AI_PONG_SANDBOX_CREDENTIAL_POLICY,
			'pong Sandbox',
			ctx,
		);
		if (!resolved) return envConfig;

		try {
			const apiKey = parseSandboxServiceCredential(resolved);
			return { serviceUrl: pongSandboxServiceUrl || undefined, apiKey };
		} catch (error) {
			this.warnCredentialFallback(
				'pong Sandbox',
				INSTANCE_AI_PONG_SANDBOX_CREDENTIAL_POLICY.id,
				ensureError(error).message,
			);
			return envConfig;
		}
	}

	private async resolveServiceCredential(
		policy: InstanceCredentialUse,
		service: string,
		ctx?: OperationContext,
	): Promise<ResolvedInstanceCredential | null> {
		if (this.deploymentConfig.type === 'cloud') return null;
		const resolved = ctx
			? this.instanceCredentialBroker.resolveForUse(policy, ctx)
			: this.instanceCredentialBroker.resolveForUse(policy);
		return await resolved.catch((error: unknown) => {
			this.warnCredentialFallback(service, policy.id, ensureError(error).message);
			return null;
		});
	}

	private warnCredentialFallback(service: string, credentialUseId: string, reason: string): void {
		this.logger
			.scoped('instance-ai')
			.warn(`Could not resolve the configured ${service} credential; using environment fallback`, {
				credentialUseId,
				error: reason,
			});
	}
}
