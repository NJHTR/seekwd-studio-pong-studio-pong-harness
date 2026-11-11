import { defineConfig } from 'eslint/config';
import { frontendOxlintResidualConfig } from '@pong/eslint-config/frontend-oxlint-residual';

export default defineConfig(frontendOxlintResidualConfig, {
	files: ['**/*.test.ts'],
	rules: { '@typescript-eslint/no-unsafe-assignment': 'warn' },
});
