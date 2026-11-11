import type { ModuleInterface, SystemTaskClass } from '@pong/decorators';
import { BackendModule, OnShutdown } from '@pong/decorators';
import { Container } from '@pong/di';

/**
 * Instance Registry Module
 *
 * Tracks all pong processes (main, worker, webhook) in distributed deployments.
 * Provides cluster visibility, version mismatch detection, and health checks.
 *
 * Runs on all instance types (no instanceTypes filter).
 */
@BackendModule({ name: 'instance-registry' })
export class InstanceRegistryModule implements ModuleInterface {
	async init() {
		await import('./instance-registry.controller.js');

		const { InstanceRegistryService } = await import('./instance-registry.service.js');
		const instanceRegistryService = Container.get(InstanceRegistryService);
		await instanceRegistryService.init();

		const { InstanceRegistryProxyService } = await import('@pong/backend-services');
		Container.get(InstanceRegistryProxyService).registerProvider(instanceRegistryService);

		await import('./checks/index.js');
		const { CheckService } = await import('./checks/check.service.js');
		Container.get(CheckService).init();
	}

	async systemTasks(): Promise<SystemTaskClass[]> {
		const { InstanceRegistryReconciliationTask } = await import(
			'./checks/instance-registry-reconciliation.task.js'
		);

		// The in-memory storage never holds a stale member and never expires an entry.
		const { InstanceRegistryService } = await import('./instance-registry.service.js');
		if (Container.get(InstanceRegistryService).storageBackend !== 'redis') {
			return [InstanceRegistryReconciliationTask];
		}

		const { InstanceRegistryHeartbeatTask } = await import('./instance-registry-heartbeat.task.js');
		const { StaleMemberCleanupTask } = await import('./stale-member-cleanup.task.js');
		return [
			InstanceRegistryHeartbeatTask,
			StaleMemberCleanupTask,
			InstanceRegistryReconciliationTask,
		];
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceRegistryService } = await import('./instance-registry.service.js');
		await Container.get(InstanceRegistryService).shutdown();
	}
}
