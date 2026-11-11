import { existsSync } from 'fs';
import path from 'path';

import { expect, test } from '../../fixtures/base';

/**
 * Asserts that the backend started by this run respects PONG_USER_FOLDER: the
 * sqlite database must be created inside the run's generated user folder (see
 * USER_FOLDER in playwright.config.ts), not in the default ~/.pong. Guards the
 * smoke suite against silently polluting the developer's own install.
 *
 * Playwright waits for backend readiness and global-setup resets its database
 * before any test runs, so the file exists by now without visiting the app.
 */
test.describe(
	'Dev-server user folder',
	{
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{
				type: 'description',
				description:
					'Verifies the dev backend creates its sqlite database inside the PONG_USER_FOLDER configured for the run.',
			},
		],
	},
	() => {
		test('sqlite database is created in the configured user folder', () => {
			// The smoke scripts always manage the webServer, so a missing value
			// means the config did not export the user folder: fail, don't skip.
			const userFolder = process.env.PONG_TEST_USER_FOLDER;
			expect(userFolder, 'playwright.config.ts must export PONG_TEST_USER_FOLDER').toBeTruthy();

			// pong creates `.pong/` inside PONG_USER_FOLDER (see getPongFolder in @pong/config).
			const dbPath = path.join(userFolder!, '.pong', 'database.sqlite');
			expect(existsSync(dbPath), `expected sqlite DB at ${dbPath}`).toBe(true);
		});
	},
);
