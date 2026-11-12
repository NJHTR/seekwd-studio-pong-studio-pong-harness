import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** What pong remembers about one easyCode thread, next to the app-server home. */
export interface EasycodeThreadState {
	easycodeThreadId: string;
	cwd: string;
	toolsetHash: string;
	gitHead: string | null;
	gitDirty: boolean | null;
	updatedAt: string;
}

export interface EasycodeWorkspaceFingerprint {
	gitHead: string | null;
	gitDirty: boolean | null;
}

export type EasycodeResumePlan = { action: 'resume' } | { action: 'fork'; reason: string };

/**
 * Remembers the easyCode thread of a pong thread outside the pong database.
 *
 * ADR-04 keeps the rollout as the truth for the conversation, so the binding
 * needs both sides to agree: the easyCode thread id and the properties that
 * make a resume valid (cwd, toolset). The file lives under the app-server home,
 * not in the workspace, so no user file is touched.
 */
export class EasycodeThreadStateStore {
	constructor(private readonly root: string) {}

	static forHome(home: string): EasycodeThreadStateStore {
		return new EasycodeThreadStateStore(join(home, 'pong-state'));
	}

	pathOf(threadId: string): string {
		return join(this.root, `${sanitize(threadId)}.json`);
	}

	async read(threadId: string): Promise<EasycodeThreadState | null> {
		try {
			const raw = await readFile(this.pathOf(threadId), 'utf8');
			const parsed: unknown = JSON.parse(raw);
			return isThreadState(parsed) ? parsed : null;
		} catch {
			return null;
		}
	}

	async write(threadId: string, state: EasycodeThreadState): Promise<void> {
		const path = this.pathOf(threadId);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, JSON.stringify(state, null, 2), 'utf8');
	}
}

/**
 * Decide whether a persisted easyCode thread may be resumed. A changed cwd or a
 * changed toolset makes the rollout unsafe to continue: the tools or the files
 * are not the ones the model saw. The caller starts a new thread and says so.
 */
export function planResume(
	state: EasycodeThreadState | null,
	expected: { cwd: string; toolsetHash: string },
): EasycodeResumePlan {
	if (state === null) return { action: 'fork', reason: 'no-thread-state' };
	if (state.cwd !== expected.cwd) return { action: 'fork', reason: 'cwd-changed' };
	if (state.toolsetHash !== expected.toolsetHash)
		return { action: 'fork', reason: 'toolset-changed' };
	return { action: 'resume' };
}

/** Capture the git identity of the workspace. Absent when cwd is not a git work tree. */
export async function captureWorkspaceFingerprint(
	cwd: string,
): Promise<EasycodeWorkspaceFingerprint> {
	try {
		const [head, status] = await Promise.all([
			run('git', ['rev-parse', 'HEAD'], { cwd, windowsHide: true }),
			run('git', ['status', '--porcelain'], { cwd, windowsHide: true }),
		]);
		return {
			gitHead: head.stdout.trim() === '' ? null : head.stdout.trim(),
			gitDirty: status.stdout.trim() !== '',
		};
	} catch {
		return { gitHead: null, gitDirty: null };
	}
}

function isThreadState(value: unknown): value is EasycodeThreadState {
	if (typeof value !== 'object' || value === null) return false;
	return (
		typeof Reflect.get(value, 'easycodeThreadId') === 'string' &&
		typeof Reflect.get(value, 'cwd') === 'string' &&
		typeof Reflect.get(value, 'toolsetHash') === 'string'
	);
}

function sanitize(id: string): string {
	return id.replace(/[^a-zA-Z0-9._-]/g, '_');
}
