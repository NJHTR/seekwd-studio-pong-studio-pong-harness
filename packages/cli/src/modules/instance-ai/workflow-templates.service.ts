import { Logger } from '@pong/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@pong/backend-network';
import { GlobalConfig } from '@pong/config';
import { Service } from '@pong/di';
import { isRecord } from '@pong/utils/is-record';

export const TEMPLATE_REQUEST_TIMEOUT_MS = 5000;

export type WorkflowTemplateResult =
	| { available: true; template: Record<string, unknown> }
	| { available: false };

@Service()
export class WorkflowTemplatesService {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		outboundHttp: OutboundHttp,
	) {
		this.http = outboundHttp.requests({
			useDefaultSsrfPolicy: 'unsafe', // Fixed, pong-controlled templates host.
			timeout: TEMPLATE_REQUEST_TIMEOUT_MS,
		});
	}

	async getTemplate(templateId: string): Promise<WorkflowTemplateResult> {
		const { enabled, host } = this.globalConfig.templates;
		if (!enabled || !host) {
			return { available: false };
		}

		const url = `${host.replace(/\/?$/, '/')}templates/workflows/${encodeURIComponent(templateId)}`;
		try {
			const body = await this.http.request<{ workflow?: unknown }>({
				url,
				method: 'GET',
				headers: { Accept: 'application/json' },
				json: true,
			});
			const workflow = isRecord(body) ? body.workflow : undefined;
			if (!isRecord(workflow)) {
				this.logger.warn('Workflow template response missing workflow payload', { templateId });
				return { available: false };
			}
			return { available: true, template: workflow };
		} catch (error) {
			this.logger.error('Error fetching workflow template', { error, templateId });
			throw error;
		}
	}
}
