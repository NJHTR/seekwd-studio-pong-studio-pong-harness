import { BackendModule, type ModuleInterface } from '@pong/decorators';

@BackendModule({ name: 'inbox', instanceTypes: ['main'] })
export class InboxModule implements ModuleInterface {
	async init() {
		await import('./inbox.controller.js');
	}
}
