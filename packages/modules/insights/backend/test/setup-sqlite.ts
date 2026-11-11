import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function setup() {
	if (
		process.env.CI !== 'true' ||
		(process.env.DB_TYPE ?? 'sqlite') !== 'sqlite' ||
		process.env.PONG_TEST_DISABLE_TEMPLATE_DB === '1'
	) {
		return;
	}

	// Migrate once before workers start. Each suite copies the template into its own folder.
	const templateDir = mkdtempSync(join(tmpdir(), 'pong-insights-sqlite-template-'));
	const settingsDir = join(templateDir, '.pong');
	mkdirSync(settingsDir);
	writeFileSync(join(settingsDir, 'config'), JSON.stringify({ encryptionKey: 'test_key' }), {
		encoding: 'utf-8',
		mode: 0o600,
	});

	const originalUserFolder = process.env.PONG_USER_FOLDER;
	const originalTemplate = process.env.PONG_TEST_SQLITE_TEMPLATE;
	process.env.PONG_USER_FOLDER = templateDir;
	const { testDb } = await import('@pong/backend-test-utils');
	const { Container } = await import('@pong/di');
	try {
		Container.reset();
		process.env.PONG_TEST_SQLITE_TEMPLATE = await testDb.initSqliteTemplateDb(settingsDir);
	} catch (error) {
		rmSync(templateDir, { recursive: true, force: true });
		throw error;
	} finally {
		Container.reset();
		if (originalUserFolder === undefined) delete process.env.PONG_USER_FOLDER;
		else process.env.PONG_USER_FOLDER = originalUserFolder;
	}

	return () => {
		if (originalTemplate === undefined) delete process.env.PONG_TEST_SQLITE_TEMPLATE;
		else process.env.PONG_TEST_SQLITE_TEMPLATE = originalTemplate;
		rmSync(templateDir, { recursive: true, force: true });
	};
}
