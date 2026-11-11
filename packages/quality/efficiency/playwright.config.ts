/* eslint-disable import-x/no-default-export */
import { defineQualityConfig } from 'pong-playwright/config';
import type { ContainerWorkerFixtures } from 'pong-playwright/containers';

const images = [
	{ name: 'pong', ref: process.env.TEST_IMAGE_PONG ?? 'pongio/pong:local' },
	{ name: 'runners', ref: process.env.TEST_IMAGE_RUNNERS ?? 'pongio/runners:local' },
	{
		name: 'runners-distroless',
		ref: process.env.TEST_IMAGE_RUNNERS_DISTROLESS ?? 'pongio/runners:local-distroless',
	},
];

export default defineQualityConfig<object, ContainerWorkerFixtures>({
	testMatch: '**/*.spec.ts',
	workers: 1,
	timeout: 300_000,
	retries: 0,
	use: { trace: 'off', video: 'off', screenshot: 'off' },
	projects: [
		...images.map((image) => ({
			name: `image-efficiency:${image.name}`,
			testDir: './images',
			metadata: { image },
		})),
		{
			name: 'memory-baselines',
			testDir: './memory/idle',
			use: {
				containerConfig: { resourceQuota: { memory: 0.75, cpu: 0.5 }, env: { E2E_TESTS: 'true' } },
			},
		},
	],
});
