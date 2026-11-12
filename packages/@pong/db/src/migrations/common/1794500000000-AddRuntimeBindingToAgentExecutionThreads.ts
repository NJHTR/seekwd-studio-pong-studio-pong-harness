import type { MigrationContext, ReversibleMigration } from '../migration-types';

const THREADS_TABLE = 'agent_execution_threads';

/**
 * Records which runtime executes the turns of a conversation, and the thread id
 * of an external runtime (M1: the easyCode app-server).
 *
 * Existing rows are local. The external id is null until the external runtime
 * starts its first thread for the conversation.
 */
export class AddRuntimeBindingToAgentExecutionThreads1794500000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			THREADS_TABLE,
			[
				column('runtimeKind')
					.varchar(16)
					.notNull.default("'local'")
					.comment('local: in-process pong runtime; easycode: external app-server runtime'),
				column('runtimeThreadId')
					.varchar(128)
					.comment('Thread id of the external runtime; null starts a new external thread'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(THREADS_TABLE, ['runtimeKind', 'runtimeThreadId'], {
			recreatesOnSqlite: true,
		});
	}
}
