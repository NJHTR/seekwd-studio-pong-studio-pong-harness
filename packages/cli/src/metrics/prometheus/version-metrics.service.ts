import { PrometheusMetricsConfig } from '@pong/config';
import { Service } from '@pong/di';
import promClient from 'prom-client';
import semverParse from 'semver/functions/parse';

import { PONG_VERSION } from '@/constants';

import type { PrometheusMetricsCollector } from './base';

/** Exposes `pong_version_info` gauge labeled with semver components (major, minor, patch). */
@Service()
export class PrometheusVersionMetricsService implements PrometheusMetricsCollector {
	constructor(private readonly config: PrometheusMetricsConfig) {}

	get enabled(): boolean {
		return true;
	}

	init() {
		const pongVersion = semverParse(PONG_VERSION ?? '0.0.0');

		if (pongVersion) {
			const versionGauge = new promClient.Gauge({
				name: `${this.config.prefix}version_info`,
				help: 'pong version info.',
				labelNames: ['version', 'major', 'minor', 'patch'],
			});

			const { version, major, minor, patch } = pongVersion;
			versionGauge.set({ version: 'v' + version, major, minor, patch }, 1);
		}
	}
}
