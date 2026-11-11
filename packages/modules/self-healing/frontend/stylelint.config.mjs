import { baseConfig } from '@pong/stylelint-config/base';

export default {
	...baseConfig,
	rules: {
		...baseConfig.rules,
		'@pong/css-var-naming': [true, { severity: 'error' }],
	},
};
