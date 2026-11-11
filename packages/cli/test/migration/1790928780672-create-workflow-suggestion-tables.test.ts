import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
} from '@pong/backend-test-utils';
import { DbConnection } from '@pong/db';
import { Container } from '@pong/di';
import { DataSource } from '@pong/typeorm';

const migrationName = 'CreateWorkflowSuggestionTables1790928780672';

describe('CreateWorkflowSuggestionTables migration', () => {
	beforeAll(async () => {
		await Container.get(DbConnection).init();
		const { queryRunner } = createTestMigrationContext(Container.get(DataSource));
		try {
			await queryRunner.clearDatabase();
		} finally {
			await queryRunner.release();
		}
		await initDbUpToMigration(migrationName);
	});

	afterAll(async () => await Container.get(DbConnection).close());

	async function expectSuggestionTablesToExist(exist: boolean) {
		const { queryRunner, tablePrefix } = createTestMigrationContext(Container.get(DataSource));
		try {
			for (const table of ['workflow_suggestion', 'workflow_suggestion_activity']) {
				expect(await queryRunner.hasTable(`${tablePrefix}${table}`)).toBe(exist);
			}
		} finally {
			await queryRunner.release();
		}
	}

	it('reverts and reapplies the suggestion schema', async () => {
		await runSingleMigration(migrationName);
		await expectSuggestionTablesToExist(true);

		await undoLastSingleMigration();
		await expectSuggestionTablesToExist(false);

		await runSingleMigration(migrationName);
		await expectSuggestionTablesToExist(true);
	});
});
