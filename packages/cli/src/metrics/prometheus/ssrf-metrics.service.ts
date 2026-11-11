import { PrometheusMetricsConfig, SsrfProtectionConfig } from '@pong/config';
import { Service } from '@pong/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';
import { DURATION_BUCKETS_SECONDS } from './constant';
import { SsrfProtectionService } from '@pong/backend-network';

/**
 * Tracks SSRF check results as counters and duration as a histogram.
 * Registers:
 * - `pong_ssrf_checks_total`
 * - `pong_ssrf_blocked_checks_total`
 * - `pong_ssrf_check_duration_seconds`
 */
@Service()
export class PrometheusSsrfMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly config: PrometheusMetricsConfig,
		private readonly ssrfConfig: SsrfProtectionConfig,
	) {}

	get enabled(): boolean {
		return this.config.includeSsrfMetrics && this.ssrfConfig.enabled;
	}

	init() {
		const checksCounter = new promClient.Counter({
			name: `${this.config.prefix}ssrf_checks_total`,
			help: 'Total number of SSRF checks by result and phase.',
			labelNames: ['result', 'phase'],
		});

		const blockedCounter = new promClient.Counter({
			name: `${this.config.prefix}ssrf_blocked_checks_total`,
			help: 'Total number of blocked SSRF checks by phase and reason.',
			labelNames: ['phase', 'reason'],
		});

		const durationHistogram = new promClient.Histogram({
			name: `${this.config.prefix}ssrf_check_duration_seconds`,
			help: 'Duration of SSRF checks in seconds.',
			labelNames: ['result', 'phase'],
			buckets: DURATION_BUCKETS_SECONDS,
		});

		this.ssrfProtectionService.events.on('ssrf.blocked', ({ phase, reason, durationMs }) => {
			checksCounter.inc({ result: 'blocked', phase });
			blockedCounter.inc({ phase, reason });
			durationHistogram.observe({ result: 'blocked', phase }, durationMs / 1000);
		});

		this.ssrfProtectionService.events.on('ssrf.allowed', ({ phase, durationMs }) => {
			checksCounter.inc({ result: 'allowed', phase });
			durationHistogram.observe({ result: 'allowed', phase }, durationMs / 1000);
		});
	}
}
