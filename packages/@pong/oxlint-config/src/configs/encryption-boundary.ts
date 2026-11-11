import { defineConfig } from 'oxlint';

export const encryptionBoundaryConfig = defineConfig({
	rules: {
		'pong-local-rules/no-encryption-guardrail-disable': 'error',
	},
});
