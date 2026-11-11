import { Logger } from '@pong/backend-common';
import { mockInstance } from '@pong/backend-test-utils';
import { Container } from '@pong/di';
import { sleep } from '@pong/utils/sleep';
import { InstanceSettings } from 'pong-core';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type CrashJournal = typeof import('@/crash-journal');

// The journal is only read and written when `inProduction` is true.
vi.mock('@pong/backend-common', async () => ({
	...(await vi.importActual<typeof import('@pong/backend-common')>('@pong/backend-common')),
	inProduction: true,
}));

vi.mock('@pong/utils/sleep', () => ({ sleep: vi.fn(async () => {}) }));

describe('crash journal on a shared user folder', () => {
	const logger = mockInstance(Logger);

	const sharedFolder = Container.get(InstanceSettings).pongFolder;
	const peerJournal = join(sharedFolder, 'crash.journal');
	const ownJournal = join(sharedFolder, 'crash-main-2.journal');

	let crashJournal: CrashJournal;

	beforeAll(async () => {
		process.env.PONG_CRASH_JOURNAL_PATH = ownJournal;
		crashJournal = await import('@/crash-journal.js');
	});

	afterAll(() => {
		delete process.env.PONG_CRASH_JOURNAL_PATH;
		rmSync(peerJournal, { force: true });
		rmSync(ownJournal, { force: true });
	});

	beforeEach(() => {
		vi.clearAllMocks();
		rmSync(peerJournal, { force: true });
		rmSync(ownJournal, { force: true });
	});

	it('writes the journal to the configured path, not to the shared user folder', async () => {
		await crashJournal.init();

		expect(existsSync(ownJournal)).toBe(true);
		expect(existsSync(peerJournal)).toBe(false);
	});

	it('does not report a crash or delay start-up because a peer wrote its journal', async () => {
		writeFileSync(peerJournal, '');

		await crashJournal.init();

		expect(logger.error).not.toHaveBeenCalledWith('Last session crashed');
		expect(sleep).not.toHaveBeenCalled();
	});

	it('reports a crash when this process left its own journal behind', async () => {
		writeFileSync(ownJournal, '');

		await crashJournal.init();

		expect(logger.error).toHaveBeenCalledWith('Last session crashed');
		expect(sleep).toHaveBeenCalledWith(10_000);
	});

	it('removes only its own journal on shutdown', async () => {
		writeFileSync(peerJournal, '');

		await crashJournal.init();
		await crashJournal.cleanup();

		expect(existsSync(ownJournal)).toBe(false);
		expect(existsSync(peerJournal)).toBe(true);
	});
});
