import { defineConfig } from 'eslint/config';
import { backendConfig } from '@pong/eslint-config/backend';

export default defineConfig(backendConfig, {
	// Relax type-aware unsafe rules for untyped mock plumbing, mirroring pong-core
	files: ['**/__tests__/**/*.ts'],
	rules: {
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
	},
});
