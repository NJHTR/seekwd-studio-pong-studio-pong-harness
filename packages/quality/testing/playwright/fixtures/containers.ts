import type { Fixtures } from '@playwright/test';
import { request } from '@playwright/test';
import { createPONGStack } from 'pong-containers/stack';
import type { PONGConfig, PONGStack } from 'pong-containers/stack';

import { CAPABILITIES, type CapabilityOption } from './capabilities';
import { ApiHelpers } from '../services/api-helper';
import { getBackendUrl } from '../utils/url-helper';

export type ContainerWorkerFixtures = {
	containerConfig: PONGConfig;
	capability?: CapabilityOption;
	pongStackConfig: PONGConfig;
	pongContainer: PONGStack;
	dbSetup: undefined;
};

function parseGlobalTestEnv(): Record<string, string> {
	const raw = process.env.PONG_TEST_ENV;
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Record<string, string>;
	} catch {
		console.warn('[containers.ts] Failed to parse PONG_TEST_ENV');
		return {};
	}
}

export const containerFixtures: Fixtures<object, ContainerWorkerFixtures> = {
	containerConfig: [{}, { scope: 'worker', option: true }],
	capability: [undefined, { scope: 'worker', option: true }],
	// Keep the same config precedence for product and efficiency suites.
	pongStackConfig: [
		async ({ capability, containerConfig: base }, use) => {
			const override: PONGConfig = !capability
				? {}
				: typeof capability === 'string'
					? CAPABILITIES[capability]
					: capability;

			const globalEnv = parseGlobalTestEnv();

			const config: PONGConfig = {
				...base,
				...override,
				services: [...new Set([...(base.services ?? []), ...(override.services ?? [])])],
				env: {
					// E2E mode reports the Enterprise plan, where the pong Assistant is off by default.
					PONG_INSTANCE_AI_ENABLED: 'true',
					...globalEnv,
					...base.env,
					...override.env,
					E2E_TESTS: 'true',
					PONG_RESTRICT_FILE_ACCESS_TO: '',
				},
				// Pass the coverage runner's output directory to the stack.
				...(process.env.PONG_COVERAGE_DIR ? { coverageHostDir: process.env.PONG_COVERAGE_DIR } : {}),
			};

			await use(config);
		},
		{ scope: 'worker', box: true },
	],
	pongContainer: [
		async ({ pongStackConfig }, use) => {
			if (getBackendUrl()) {
				await use(null!);
				return;
			}

			const container = await createPONGStack(pongStackConfig);
			try {
				await use(container);
			} finally {
				if (process.env.PONG_CONTAINERS_KEEPALIVE === 'true') {
					console.log('\n=== KEEPALIVE: Containers left running for debugging ===');
					console.log(`    URL: ${container.baseUrl}`);
					console.log(`    Project: ${container.projectName}`);
					console.log('    Cleanup: pnpm --filter pong-containers stack:clean:all');
					console.log('=========================================================\n');
				} else {
					await container.stop();
				}
			}
		},
		{ scope: 'worker', box: true },
	],
	dbSetup: [
		async ({ pongContainer, pongStackConfig }, use) => {
			if (pongContainer) {
				console.log('Resetting database for new container');
				const apiContext = await request.newContext({ baseURL: pongContainer.baseUrl });
				const api = new ApiHelpers(apiContext);
				await api.resetDatabase();
				await apiContext.dispose();

				// The reset endpoint only reaches the control plane database.
				if (pongStackConfig.engine) {
					await (
						pongContainer.services.enginePostgres ?? pongContainer.services.postgres
					).truncateEngineDatabase();
				}
			}
			await use(undefined);
		},
		{ scope: 'worker' },
	],
};
