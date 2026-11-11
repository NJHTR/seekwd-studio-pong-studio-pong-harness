import { defineConfig } from 'eslint/config';
import { backendConfig } from '@pong/eslint-config/backend';

export default defineConfig(backendConfig, {
	ignores: ['coverage/**', 'dist/**'],
});
