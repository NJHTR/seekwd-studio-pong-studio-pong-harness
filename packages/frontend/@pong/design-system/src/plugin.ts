import type { Plugin } from 'vue';

import * as directives from './directives';

export interface PongPluginOptions {}

export const PongPlugin: Plugin<PongPluginOptions> = {
	install: (app) => {
		for (const [name, directive] of Object.entries(directives)) {
			app.directive(name, directive);
		}
	},
};
