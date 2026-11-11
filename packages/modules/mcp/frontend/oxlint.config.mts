import { frontendConfig } from '@pong/oxlint-config/frontend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
});
