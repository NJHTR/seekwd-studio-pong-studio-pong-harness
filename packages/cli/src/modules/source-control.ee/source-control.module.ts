import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';
import { Container } from '@pong/di';

@BackendModule({
	name: 'source-control',
	licenseFlag: 'feat:sourceControl',
	instanceTypes: ['main'],
})
export class SourceControlModule implements ModuleInterface {
	async init() {
		await import('./source-control.controller.ee.js');

		const { SourceControlService } = await import('./source-control.service.ee.js');
		await Container.get(SourceControlService).start();
	}
}
