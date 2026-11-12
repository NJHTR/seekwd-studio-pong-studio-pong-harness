/**
 * Per-run easyCode home lifecycle.
 *
 * easyCode reads any absolute path. Its workspace-write sandbox only limits
 * writes, so a later agent can recover facts from a sibling agent's rollout
 * JSONL under the shared EASYCODE_HOME. A per-run home removes that path after
 * the run: the run's sessions, rollout logs, and SQLite files all live in one
 * directory that is deleted on success, failure, or crash.
 *
 * The home is seeded with config/auth/installation_id from the base home, so
 * model access works without copying session data.
 */

import { constants as fsConstants } from 'node:fs';
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { ProtocolError } from './errors';

export const DEFAULT_STALE_RUN_HOME_TTL_MS = 24 * 60 * 60 * 1_000;
export const RUN_HOME_PREFIX = 'run-';
export const DEFAULT_SEEDED_HOME_FILES = ['config.toml', 'auth.json', 'installation_id'];

const RUN_ID_PATTERN = /^[A-Za-z0-9._-]+$/u;

export interface EasyCodeRunHomeOptions {
	/** Base home to seed config/auth/installation_id from. */
	baseHome?: string;
	/** Parent directory for per-run homes. Default: PONG_EASYCODE_RUNS_ROOT or the temp dir. */
	runsRoot?: string;
	/** Run id and directory name. Default: run-<time>-<random>. */
	runId?: string;
	/** Stale TTL used by cleanupStaleRunHomes. Default: 24h. */
	staleTtlMs?: number;
	/** Files to seed when present in the base home. */
	seedFiles?: readonly string[];
}

export interface EasyCodeRunHome {
	runId: string;
	/** Absolute EASYCODE_HOME for this run. */
	home: string;
	runsRoot: string;
	baseHome: string;
	createdAtMs: number;
	seededFiles: string[];
}

export interface StaleRunHomeCleanupResult {
	scanned: number;
	removed: string[];
	kept: number;
	failed: Array<{ path: string; message: string }>;
}

export function resolveEasyCodeBaseHome(env: NodeJS.ProcessEnv = process.env): string {
	const configured = env.EASYCODE_HOME;
	if (configured !== undefined && configured !== '') return configured;
	return path.join(env.USERPROFILE ?? env.HOME ?? homedir(), '.easycode');
}

export function resolveRunHomesRoot(env: NodeJS.ProcessEnv = process.env): string {
	const configured = env.PONG_EASYCODE_RUNS_ROOT;
	if (configured !== undefined && configured !== '') return configured;
	return path.join(tmpdir(), 'pong-easycode-runs');
}

function validateRunId(runId: string): string {
	if (runId === '.' || runId === '..' || !RUN_ID_PATTERN.test(runId)) {
		throw new ProtocolError(
			`invalid run home id "${runId}"; use letters, digits, dot, underscore, dash`,
		);
	}
	return runId;
}

/**
 * Create an isolated home for one easyCode run. The directory is empty except
 * for the seeded credentials, so no session or rollout data is inherited.
 */
export async function createRunHome(
	options: EasyCodeRunHomeOptions = {},
): Promise<EasyCodeRunHome> {
	const baseHome = options.baseHome ?? resolveEasyCodeBaseHome();
	const runsRoot = options.runsRoot ?? resolveRunHomesRoot();
	const runId = validateRunId(
		options.runId ??
			`${RUN_HOME_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
	);
	const home = path.join(runsRoot, runId);
	const resolvedRoot = path.resolve(runsRoot);
	if (path.dirname(path.resolve(home)) !== resolvedRoot) {
		throw new ProtocolError(`run home escapes runs root: ${home}`);
	}
	await mkdir(home, { recursive: true });
	const seededFiles: string[] = [];
	for (const fileName of options.seedFiles ?? DEFAULT_SEEDED_HOME_FILES) {
		try {
			await copyFile(
				path.join(baseHome, fileName),
				path.join(home, fileName),
				fsConstants.COPYFILE_EXCL,
			);
			seededFiles.push(fileName);
		} catch {
			// A missing optional seed file is fine (for example auth.json when no login).
		}
	}
	return { runId, home, runsRoot, baseHome, createdAtMs: Date.now(), seededFiles };
}

/** Remove one run home. Safe to call twice and safe after a crash. */
export async function cleanupRunHome(
	runHome: Pick<EasyCodeRunHome, 'home'> | string,
): Promise<void> {
	const home = typeof runHome === 'string' ? runHome : runHome.home;
	await rm(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

/**
 * Remove run homes older than the TTL. Call this before the first per-run
 * start, so a host crash that skipped cleanup does not leak disk space.
 */
export async function cleanupStaleRunHomes(
	options: EasyCodeRunHomeOptions & { now?: () => number } = {},
): Promise<StaleRunHomeCleanupResult> {
	const runsRoot = options.runsRoot ?? resolveRunHomesRoot();
	const staleTtlMs = options.staleTtlMs ?? DEFAULT_STALE_RUN_HOME_TTL_MS;
	const now = options.now ?? (() => Date.now());
	const result: StaleRunHomeCleanupResult = { scanned: 0, removed: [], kept: 0, failed: [] };
	let entries;
	try {
		entries = await readdir(runsRoot, { withFileTypes: true });
	} catch {
		return result;
	}
	for (const entry of entries) {
		if (!entry.isDirectory() || !entry.name.startsWith(RUN_HOME_PREFIX)) continue;
		result.scanned += 1;
		const home = path.join(runsRoot, entry.name);
		try {
			const info = await stat(home);
			if (now() - info.mtimeMs <= staleTtlMs) {
				result.kept += 1;
				continue;
			}
			await cleanupRunHome(home);
			result.removed.push(home);
		} catch (error) {
			result.failed.push({
				path: home,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return result;
}
