import { defineConfig } from 'eslint/config';
import { backendConfig } from '@pong/eslint-config/backend';

export default defineConfig(backendConfig, {
	files: ['services/keycloak.ts'],
	// Test infrastructure that talks to a container it started itself,
	// so the guarded client buys nothing here.
	rules: {
		'pong-local-rules/no-uncentralized-http': 'off',
	},
});
