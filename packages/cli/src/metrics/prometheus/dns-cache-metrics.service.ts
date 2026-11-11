import { InMemoryDnsCache } from '@pong/backend-network';
import { PrometheusMetricsConfig, SsrfProtectionConfig } from '@pong/config';
import { Service } from '@pong/di';
import promClient from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/**
 * Tracks DNS cache performance as counters and a gauge.
 * Only registered when SSRF protection is enabled.
 *
 * Registers:
 * - `pong_ssrf_dns_cache_hits_total`: DNS cache hits
 * - `pong_ssrf_dns_cache_misses_total`: DNS cache misses
 * - `pong_ssrf_dns_cache_evictions_total`: LRU evictions due to capacity pressure
 * - `pong_ssrf_dns_cache_size`: current number of entries in the cache
 */
@Service()
export class PrometheusDnsCacheMetricsService implements PrometheusMetricsCollector {
	constructor(
		private readonly dnsCache: InMemoryDnsCache,
		private readonly config: PrometheusMetricsConfig,
		private readonly ssrfConfig: SsrfProtectionConfig,
	) {}

	get enabled(): boolean {
		return this.config.includeDnsCacheMetrics && this.ssrfConfig.enabled;
	}

	init() {
		this.initializeCounter('hit', 'hits');
		this.initializeCounter('miss', 'misses');
		this.initializeCounter('eviction', 'evictions');

		const dnsCache = this.dnsCache;
		new promClient.Gauge({
			name: `${this.config.prefix}ssrf_dns_cache_size`,
			help: 'Current number of entries in the DNS cache.',
			collect() {
				this.set(dnsCache.size);
			},
		});
	}

	private initializeCounter(
		eventName: Parameters<InMemoryDnsCache['events']['on']>[0],
		kind: string,
	) {
		const counter = new promClient.Counter({
			name: `${this.config.prefix}ssrf_dns_cache_${kind}_total`,
			help: `Total number of DNS cache ${kind}.`,
		});
		counter.inc(0);
		this.dnsCache.events.on(eventName, () => counter.inc(1));
	}
}
