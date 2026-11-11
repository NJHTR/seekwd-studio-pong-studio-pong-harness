import { defineConfig } from 'oxlint';

export const backendNetworkBoundaryConfig = defineConfig({
	rules: {
		'pong-local-rules/no-uncentralized-http': [
			'error',
			{
				allow: ['packages/@pong/backend-network/', 'packages/quality/efficiency/scale/benchmark/'],
			},
		],
	},
});
