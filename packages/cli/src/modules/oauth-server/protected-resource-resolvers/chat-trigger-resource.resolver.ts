import { Logger } from '@pong/backend-common';
import { GlobalConfig } from '@pong/config';
import { WorkflowRepository } from '@pong/db';
import { Service } from '@pong/di';

import { UrlService } from '@pong/backend-services';
import { WebhookService } from '@/webhooks/webhook.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ChatTriggerResourceResolverBase } from './chat-trigger-resource.base';

@Service()
export class ChatTriggerResourceResolver extends ChatTriggerResourceResolverBase {
	constructor(
		protected readonly config: GlobalConfig,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		protected readonly logger: Logger,
		protected readonly workflowFinderService: WorkflowFinderService,
	) {
		super();
	}

	readonly id = 'chat-trigger';

	protected get endpoint() {
		return this.config.endpoints.webhook;
	}

	protected get baseUrl() {
		return this.urlService.getWebhookBaseUrl();
	}

	/**
	 * The `setup` GET is the page the visitor loads and the only redirect target, so it is the
	 * leg the resource names. Static-only (no dynamic probe): this path is reachable
	 * unauthenticated. The node comes from the published version, never the draft.
	 */
	protected async findChatTrigger(path: string) {
		const webhook = await this.webhookService.findStaticWebhook('GET', path);
		if (!webhook || webhook.isDynamic) {
			return undefined;
		}

		const workflow = await this.workflowRepository.findOne({
			where: { id: webhook.workflowId },
			relations: { activeVersion: true },
		});
		if (!workflow?.activeVersion) {
			return undefined;
		}

		const node = workflow.activeVersion.nodes.find((n) => n.name === webhook.node);
		if (!node) {
			return undefined;
		}

		return { node, workflowId: workflow.id, workflowName: workflow.name };
	}
}
