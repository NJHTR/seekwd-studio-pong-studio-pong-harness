import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';

/**
 * Owns the `execution_ledger` table and folds it into the registered fold steps.
 * Opt-in for now: enable it with `PONG_ENABLED_MODULES=execution-ledger`.
 */
@BackendModule({ name: 'execution-ledger' })
export class ExecutionLedgerModule implements ModuleInterface {
	async systemTasks() {
		const { ExecutionLedgerFoldTask } = await import('./fold/execution-ledger-fold.task.js');
		return [ExecutionLedgerFoldTask];
	}

	async entities() {
		const { ExecutionLedgerEntity } = await import(
			'./database/entities/execution-ledger.entity.js'
		);
		return [ExecutionLedgerEntity];
	}
}
