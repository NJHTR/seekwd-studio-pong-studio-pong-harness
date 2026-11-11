import { createTestDatabaseGlobalSetup } from 'pong-containers/test-db-global-setup';

export const { setup, teardown } = createTestDatabaseGlobalSetup({
	initializeTemplateDb: async (templateName) => {
		// Resolve config after the global setup has populated the DB environment.
		const { testDb } = await import('@pong/backend-test-utils');
		await testDb.initTemplateDb(templateName);
	},
});
