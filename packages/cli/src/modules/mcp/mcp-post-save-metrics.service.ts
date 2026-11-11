import { Logger } from '@pong/backend-common';
import { EventService } from '@pong/backend-services';
import { PrometheusMetricsConfig } from '@pong/config';
import { Service } from '@pong/di';

@Service()
export class McpPostSaveMetricsService {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {}

	/**
	 * Emit a low-cardinality post-save failure metric event.
	 * This method must not throw.
	 */
	incrementPostSaveFailure(tool: 'create' | 'update', error: unknown): void {
		try {
			if (!this.config.enable) return;

			const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
			this.eventService.emit('mcp-post-save-failure', { tool, errorType });
		} catch (error) {
			this.logger.debug('Failed to record post-save failure metric', { error });
		}
	}
}
