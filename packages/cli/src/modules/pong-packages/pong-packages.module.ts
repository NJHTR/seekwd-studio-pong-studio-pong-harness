import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';

@BackendModule({
	name: 'pong-packages',
})
export class PongPackagesModule implements ModuleInterface {
	async init() {
		await import('./pong-packages.service.js');
	}
}
