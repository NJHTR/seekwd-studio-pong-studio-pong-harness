import { isEnvFeatureEnabled } from '@pong/backend-common';
import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';
import { Container } from '@pong/di';

import { RuntimeCredentialProxyService } from '@pong/backend-services';

@BackendModule({ name: 'runtime-credentials' })
export class RuntimeCredentialsModule implements ModuleInterface {
	async init() {
		if (!isEnvFeatureEnabled('PONG_ENV_FEAT_RUNTIME_CREDENTIALS')) return;

		const { RuntimeCredentialsService } = await import('./runtime-credentials.service.js');
		Container.get(RuntimeCredentialsService).init();

		await import('./runtime-credentials-context-hook.js');
		await import('./runtime-credentials.config.js');
		const { RuntimeCredentialsAccessService } = await import(
			'./runtime-credentials-access.service.js'
		);
		Container.get(RuntimeCredentialProxyService).registerProvider(
			Container.get(RuntimeCredentialsAccessService),
		);
	}
}
