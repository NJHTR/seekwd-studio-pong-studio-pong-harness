import type { ResourceLocatorCallbackFactory } from '@pong/ai-workflow-builder';
import {
	AiWorkflowBuilderService,
	createPassthroughSsrfGuard,
	ChatPayload,
} from '@pong/ai-workflow-builder';
import { Logger } from '@pong/backend-common';
import { WorkflowBuilderSessionRepository } from '@pong/backend-module-workflow-builder';
import { OutboundHttp, SsrfProtectionService } from '@pong/backend-network';
import { GlobalConfig, SsrfProtectionConfig } from '@pong/config';
import { BUILTIN_NODES_PACKAGES } from '@pong/constants';
import { Service } from '@pong/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import * as fs from 'fs';
import { InstanceSettings } from 'pong-core';
import type {
	INodeCredentials,
	INodeParameters,
	INodeTypeNameVersion,
	IUser,
	ITelemetryTrackProperties,
} from 'pong-workflow';
import * as path from 'path';

import { PONG_VERSION } from '@/constants';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { UrlService } from '@pong/backend-services';
import { Telemetry } from '@/telemetry';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';
import { getBase } from '@/workflow-execute-additional-data';

/**
 * This service wraps the actual AiWorkflowBuilderService to avoid circular dependencies.
 * Instead of extending, we're delegating to the real service which is created on-demand.
 */
@Service()
export class WorkflowBuilderService {
	private service: AiWorkflowBuilderService | undefined;

	private client: AiAssistantClient | undefined;

	private initPromise: Promise<AiWorkflowBuilderService> | undefined;

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly license: License,
		private readonly config: GlobalConfig,
		private readonly logger: Logger,
		private readonly urlService: UrlService,
		private readonly push: Push,
		private readonly telemetry: Telemetry,
		private readonly instanceSettings: InstanceSettings,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly sessionRepository: WorkflowBuilderSessionRepository,
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly outboundHttp: OutboundHttp,
	) {
		// Register a post-processor to update node types when they change.
		// This ensures newly installed/updated/uninstalled community packages are recognized
		// while preserving existing sessions.
		this.loadNodesAndCredentials.addPostProcessor(async () => await this.refreshNodeTypes());
	}

	/**
	 * Update the node types on the existing service instance.
	 * Called automatically when postProcessLoaders() runs (e.g., after community package changes).
	 * This preserves existing sessions while making new node types available.
	 */
	async refreshNodeTypes() {
		if (this.service) {
			const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();
			this.service.updateNodeTypes(nodeTypeDescriptions);
		}
	}

	private async getService(): Promise<AiWorkflowBuilderService> {
		if (this.service) return this.service;

		this.initPromise ??= this.initializeService();

		return await this.initPromise;
	}

	private async initializeService(): Promise<AiWorkflowBuilderService> {
		// Create AiAssistantClient if baseUrl is configured
		const baseUrl = this.config.aiAssistant.baseUrl;
		if (baseUrl) {
			const licenseCert = await this.license.loadCertStr();
			const consumerId = this.license.getConsumerId();

			this.client = new AiAssistantClient({
				licenseCert,
				consumerId,
				baseUrl,
				n8nVersion: PONG_VERSION,
				instanceId: this.instanceSettings.instanceId,
			});

			// Register for license certificate updates
			this.license.onCertRefresh((cert) => {
				this.client?.updateLicenseCert(cert);
			});
		}

		// Create callback that uses the push service
		const onCreditsUpdated = (userId: string, creditsQuota: number, creditsClaimed: number) => {
			this.push.sendToUsers(
				{
					type: 'updateBuilderCredits',
					data: {
						creditsQuota,
						creditsClaimed,
					},
				},
				[userId],
			);
		};

		// Callback for AI Builder to send telemetry events
		const onTelemetryEvent = (event: string, properties: ITelemetryTrackProperties) => {
			this.telemetry.track(event, properties);
		};

		// Factory for creating resource locator callbacks scoped to a user
		const resourceLocatorCallbackFactory: ResourceLocatorCallbackFactory = (userId: string) => {
			return async (
				methodName: string,
				path: string,
				nodeTypeAndVersion: INodeTypeNameVersion,
				currentNodeParameters: INodeParameters,
				credentials?: INodeCredentials,
				filter?: string,
				paginationToken?: string,
			) => {
				const additionalData = await getBase({
					userId,
					currentNodeParameters,
				});

				return await this.dynamicNodeParametersService.getResourceLocatorResults(
					methodName,
					path,
					additionalData,
					nodeTypeAndVersion,
					currentNodeParameters,
					credentials,
					filter,
					paginationToken,
				);
			};
		};

		await this.loadNodesAndCredentials.postProcessLoaders();
		const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();

		// web_fetch SSRF protection is gated on the global configuration.
		const webFetchSsrfGuard = this.ssrfConfig.enabled
			? this.ssrfProtectionService
			: createPassthroughSsrfGuard();

		// Sharing `createAiProxyFetch` follows the instance's configured SSRF
		// policy (web_fetch is guarded separately above) and applies the long AI
		// timeout so workflow generation is not cut off at undici's 5-minute default.
		const modelFetch = createAiProxyFetch(this.outboundHttp);

		this.service = new AiWorkflowBuilderService(
			nodeTypeDescriptions,
			this.sessionRepository,
			this.client,
			this.logger,
			this.instanceSettings.instanceId,
			this.urlService.getInstanceBaseUrl(),
			PONG_VERSION,
			onCreditsUpdated,
			onTelemetryEvent,
			this.resolveBuiltinNodeDefinitionDirs(),
			resourceLocatorCallbackFactory,
			webFetchSsrfGuard,
			modelFetch,
		);

		return this.service;
	}

	private resolveBuiltinNodeDefinitionDirs(): string[] {
		const dirs: string[] = [];
		for (const packageId of BUILTIN_NODES_PACKAGES) {
			try {
				const packageJsonPath = require.resolve(`${packageId}/package.json`);
				const distDir = path.dirname(packageJsonPath);
				const nodeDefsDir = path.join(distDir, 'dist', 'node-definitions');
				if (fs.existsSync(nodeDefsDir)) {
					dirs.push(nodeDefsDir);
				}
			} catch {
				// Package not installed, skip
			}
		}
		return dirs;
	}

	async *chat(payload: ChatPayload, user: IUser, abortSignal?: AbortSignal) {
		const service = await this.getService();
		yield* service.chat(payload, user, abortSignal);
	}

	async getSessions(workflowId: string | undefined, user: IUser, isCodeBuilder?: boolean) {
		const service = await this.getService();
		const sessions = await service.getSessions(workflowId, user, isCodeBuilder);
		return sessions;
	}

	async getBuilderInstanceCredits(user: IUser) {
		const service = await this.getService();
		return await service.getBuilderInstanceCredits(user);
	}

	async clearSession(workflowId: string, user: IUser): Promise<void> {
		const service = await this.getService();
		await service.clearSession(workflowId, user);
	}

	async truncateMessagesAfter(
		workflowId: string,
		user: IUser,
		messageId: string,
		versionCardId?: string,
	): Promise<boolean> {
		const service = await this.getService();
		return await service.truncateMessagesAfter(workflowId, user, messageId, versionCardId);
	}
}
