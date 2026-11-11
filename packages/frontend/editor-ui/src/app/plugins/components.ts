import type { Plugin } from 'vue';

import 'regenerator-runtime/runtime';

import { ElLoading, ElMessageBox } from 'element-plus';
import { PongPlugin } from '@pong/design-system';
import { useMessage } from '@/app/composables/useMessage';

export const GlobalComponentsPlugin: Plugin = {
	install(app) {
		const messageService = useMessage();

		app.use(PongPlugin, {});

		app.use(ElLoading);

		app.config.globalProperties.$loading = ElLoading.service;
		app.config.globalProperties.$msgbox = ElMessageBox;
		app.config.globalProperties.$alert = messageService.alert;
		app.config.globalProperties.$confirm = messageService.confirm;
		app.config.globalProperties.$prompt = messageService.prompt;
		app.config.globalProperties.$message = messageService.message;
	},
};
