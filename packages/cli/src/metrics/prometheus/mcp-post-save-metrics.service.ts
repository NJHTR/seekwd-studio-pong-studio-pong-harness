import { EventService } from '@pong/backend-services';
import { PrometheusMetricsConfig } from '@pong/config';
import { Service } from '@pong/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

@Service()
export class PrometheusMcpPostSaveMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
	) {}

	get enabled(): boolean {
		return this.config.includeMcpPostSaveMetrics;
	}

	init() {
		const postSaveFailuresTotal = new promClient.Counter({
			name: `${this.config.prefix}mcp_post_save_failures_total`,
			help: 'MCP workflow-builder tool failures that occurred after a successful database write (hooks, telemetry, auto-assign). The client still receives success — these are observability-only.',
			labelNames: ['tool', 'error_type'],
		});

		this.eventService.on('mcp-post-save-failure', ({ tool, errorType }) => {
			postSaveFailuresTotal.inc({ tool, error_type: errorType }, 1);
		});
	}
}
