import { baseConfig } from '@pong/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	options: { typeAware: true },
	rules: {
		'no-prototype-builtins': 'off',
		'typescript/no-deprecated': 'off',
	},
});
