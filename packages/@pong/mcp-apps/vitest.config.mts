import vue from '@vitejs/plugin-vue';
import { createVitestConfig } from '@pong/vitest-config/frontend';
import { resolve } from 'node:path';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(createVitestConfig({ setupFiles: [] }), {
	plugins: [vue()],
	resolve: {
		alias: {
			'@mcp-apps': resolve(__dirname, 'src'),
			'@pong/design-system': resolve(__dirname, '../../frontend/@pong/design-system/src'),
		},
	},
});
