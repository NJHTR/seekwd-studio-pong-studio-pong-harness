import { ModuleRegistry } from '@pong/backend-common';
import { EngineConfig } from '@pong/config';
import { Service } from '@pong/di';
import type { IWorkflowSettings } from 'pong-workflow';

/**
 * Puts a new workflow on engine v2 when the instance runs new workflows on v2 and the
 * creator did not choose an engine. A workflow without an engine runs on v1, so v1 is
 * never written.
 */
@Service()
export class WorkflowEngineDefaults {
	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	applyTo(settings: IWorkflowSettings): IWorkflowSettings;
	applyTo(settings: IWorkflowSettings | undefined): IWorkflowSettings | undefined;
	applyTo(settings: IWorkflowSettings | undefined): IWorkflowSettings | undefined {
		if (settings?.engineType !== undefined || !this.runsNewWorkflowsOnV2()) return settings;

		return { ...(settings ?? {}), engineType: 'v2' };
	}

	// Read at call time: modules become active after services are constructed.
	private runsNewWorkflowsOnV2() {
		return this.engineConfig.defaultType === 'v2' && this.moduleRegistry.isActive('engine-v2');
	}
}
