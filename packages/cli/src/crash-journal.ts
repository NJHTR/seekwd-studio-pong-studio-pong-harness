import { inProduction, Logger } from '@pong/backend-common';
import { Container } from '@pong/di';
import { existsSync } from 'fs';
import { mkdir, utimes, open, rm } from 'fs/promises';
import { sleep } from '@pong/utils/sleep';
import { InstanceSettings } from 'pong-core';
import { join, dirname } from 'path';

export const touchFile = async (filePath: string): Promise<void> => {
	await mkdir(dirname(filePath), { recursive: true });
	const time = new Date();
	try {
		await utimes(filePath, time, time);
	} catch {
		const fd = await open(filePath, 'w');
		await fd.close();
	}
};

const { pongFolder } = Container.get(InstanceSettings);

/**
 * `PONG_CRASH_JOURNAL_PATH` is the absolute path to the journal of this process.
 * Set it when several processes share one `PONG_USER_FOLDER` on a writable
 * volume, because each process needs its own journal: processes that share one
 * journal report a crash that did not happen, and the shutdown of one process
 * removes the journal of another process. The orchestrator owns the uniqueness,
 * the same way it does for `PONG_EVENTBUS_LOGWRITER_LOGFULLPATH`. The parent
 * directory is created if it is missing. Empty (default) keeps
 * `${PONG_USER_FOLDER}/crash.journal`.
 */
export const journalFile = process.env.PONG_CRASH_JOURNAL_PATH || join(pongFolder, 'crash.journal');

let lastSessionCrashed = false;

/** Whether `init()` found the journal of a session that did not shut down cleanly. */
export const didLastSessionCrash = () => lastSessionCrashed;

export const init = async () => {
	if (!inProduction || process.env.PONG_DEV_RELOAD === 'true') return;

	if (existsSync(journalFile)) {
		// Crash detected
		lastSessionCrashed = true;
		Container.get(Logger).error('Last session crashed');
		// add a 10 seconds pause to slow down crash-looping
		await sleep(10_000);
	}
	await touchFile(journalFile);
};

export const cleanup = async () => {
	await rm(journalFile, { force: true });
};
