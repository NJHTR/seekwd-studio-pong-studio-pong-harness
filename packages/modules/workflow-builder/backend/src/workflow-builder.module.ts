import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';

@BackendModule({ name: 'workflow-builder', instanceTypes: ['main'] })
export class WorkflowBuilderModule implements ModuleInterface {
	async entities() {
		const { WorkflowBuilderSession } = await import('./workflow-builder-session.entity.js');
		return [WorkflowBuilderSession];
	}
}
