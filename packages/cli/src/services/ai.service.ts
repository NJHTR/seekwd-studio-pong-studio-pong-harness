import type {
	AiApplySuggestionRequestDto,
	AiAskRequestDto,
	AiChatRequestDto,
} from '@pong/api-types';
import { Logger } from '@pong/backend-common';
import { GlobalConfig } from '@pong/config';
import { Service } from '@pong/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { ErrorReporter, InstanceSettings } from 'pong-core';
import { assert, type IUser } from 'pong-workflow';

import { PONG_VERSION } from '../constants';
import { License } from '../license';
import { callAiServiceWithRetry } from '../utils/ai-service-retry';

@Service()
export class AiService {
	private client: AiAssistantClient | undefined;

	private initPromise: Promise<void> | undefined;

	constructor(
		private readonly licenseService: License,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {}

	async init() {
		// oxlint-disable-next-line typescript/no-deprecated
		const aiAssistantEnabled = this.licenseService.isAiAssistantEnabled();

		if (!aiAssistantEnabled) {
			return;
		}

		const licenseCert = await this.licenseService.loadCertStr();
		const consumerId = this.licenseService.getConsumerId();
		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		const logLevel = this.globalConfig.logging.level;

		this.client = new AiAssistantClient({
			licenseCert,
			consumerId,
			n8nVersion: PONG_VERSION,
			baseUrl,
			logLevel,
			instanceId: this.instanceSettings.instanceId,
		});

		// Register for license certificate updates
		this.licenseService.onCertRefresh((cert) => {
			this.client?.updateLicenseCert(cert);
		});
	}

	async chat(payload: AiChatRequestDto, user: IUser) {
		const client = await this.getClient();
		return await client.chat(payload, { id: user.id });
	}

	async applySuggestion(payload: AiApplySuggestionRequestDto, user: IUser) {
		const client = await this.getClient();
		return await client.applySuggestion(payload, { id: user.id });
	}

	/** @deprecated Serves `POST /rest/ai/ask-ai`. Removed in v3. */
	async askAi(payload: AiAskRequestDto, user: IUser) {
		const client = await this.getClient();
		return await client.askAi(payload, { id: user.id });
	}

	/** Whether the AI service proxy is enabled (license + base URL configured). */
	isProxyEnabled(): boolean {
		// oxlint-disable-next-line typescript/no-deprecated
		return this.licenseService.isAiAssistantEnabled() && !!this.globalConfig.aiAssistant.baseUrl;
	}

	/** Return the initialized AiAssistantClient. Initializes lazily if needed. */
	async getClient(): Promise<AiAssistantClient> {
		if (!this.client) {
			this.initPromise ??= this.init();
			await this.initPromise;
			if (!this.client) {
				this.initPromise = undefined; // allow retry after license activation
			}
		}
		assert(this.client, 'AI Assistant client not initialized');
		return this.client;
	}

	async createFreeAiCredits(user: IUser) {
		const client = await this.getClient();
		return await callAiServiceWithRetry(
			'AI credits credential generation',
			async () => await client.generateAiCreditsCredentials(user),
			this.logger,
			this.errorReporter,
			{ retryOnTimeout: false },
		);
	}
}
