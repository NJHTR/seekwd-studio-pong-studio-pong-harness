import { PrometheusMetricsConfig } from '@pong/config';
import { OnLeaderStepdown, OnLeaderTakeover } from '@pong/decorators';
import { Service } from '@pong/di';
import { InstanceSettings } from 'pong-core';
import promClient, { Gauge } from 'prom-client';

import type { PrometheusMetricsCollector } from './base';

/**
 * Exposes `pong_instance_role_leader` gauge (1 = leader, 0 = follower), updated on leader events.
 * Only enabled on main instances.
 */
@Service()
export class PrometheusInstanceRoleMetricsService implements PrometheusMetricsCollector {
	private gauge!: Gauge;

	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	get enabled(): boolean {
		return this.instanceSettings.instanceType === 'main';
	}

	init() {
		this.gauge = new promClient.Gauge({
			name: `${this.config.prefix}instance_role_leader`,
			help: 'Whether this main instance is the leader (1) or not (0).',
		});

		this.gauge.set(this.instanceSettings.isLeader ? 1 : 0);
	}

	@OnLeaderTakeover()
	updateOnLeaderTakeover() {
		this.gauge.set(1);
	}

	@OnLeaderStepdown()
	updateOnLeaderStepdown() {
		this.gauge.set(0);
	}
}
