import { ModuleMetadata } from '@pong/decorators';
import { Container } from '@pong/di';

import { ExecutionLedgerEntity } from '../database/entities/execution-ledger.entity';
import { ExecutionLedgerModule } from '../execution-ledger.module';

describe('ExecutionLedgerModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('execution-ledger')?.class).toBe(
			ExecutionLedgerModule,
		);
	});

	it('registers the ledger entity', async () => {
		expect(await new ExecutionLedgerModule().entities()).toEqual([ExecutionLedgerEntity]);
	});

	it('registers the fold system task', async () => {
		const tasks = await new ExecutionLedgerModule().systemTasks();

		expect(tasks.map((task) => task.name)).toEqual(['ExecutionLedgerFoldTask']);
	});
});
