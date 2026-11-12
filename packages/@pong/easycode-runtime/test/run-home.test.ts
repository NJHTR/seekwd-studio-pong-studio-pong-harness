import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	cleanupRunHome,
	cleanupStaleRunHomes,
	createRunHome,
	resolveEasyCodeBaseHome,
	resolveRunHomesRoot,
} from '../src/index';

const tempDirs: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

async function makeBaseHome(): Promise<string> {
	const baseHome = await makeTempDir('pong-runhome-base-');
	await writeFile(path.join(baseHome, 'config.toml'), 'model = "fake"\n', 'utf8');
	await writeFile(path.join(baseHome, 'auth.json'), '{"OPENAI_API_KEY":"fake"}\n', 'utf8');
	return baseHome;
}

afterEach(async () => {
	for (const dir of tempDirs.splice(0)) {
		await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(
			() => undefined,
		);
	}
});

describe('createRunHome', () => {
	it('creates an isolated home under the runs root and seeds credentials', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-runhome-runs-');
		const runHome = await createRunHome({ baseHome, runsRoot, runId: 'run-test-1' });
		expect(runHome.home).toBe(path.join(runsRoot, 'run-test-1'));
		expect(runHome.runId).toBe('run-test-1');
		expect(runHome.seededFiles.sort()).toEqual(['auth.json', 'config.toml']);
		expect(existsSync(path.join(runHome.home, 'config.toml'))).toBe(true);
		expect(existsSync(path.join(runHome.home, 'auth.json'))).toBe(true);
		// Session and rollout directories are not inherited from the base home.
		expect(existsSync(path.join(runHome.home, 'sessions'))).toBe(false);
		expect(existsSync(path.join(runHome.home, 'history.jsonl'))).toBe(false);
	});

	it('rejects an id that escapes the runs root', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-runhome-runs-');
		await expect(createRunHome({ baseHome, runsRoot, runId: '..' })).rejects.toThrow();
		await expect(createRunHome({ baseHome, runsRoot, runId: 'a/b' })).rejects.toThrow();
		await expect(createRunHome({ baseHome, runsRoot, runId: '' })).rejects.toThrow();
	});

	it('generates a run-<id> directory by default', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-runhome-runs-');
		const runHome = await createRunHome({ baseHome, runsRoot });
		expect(runHome.runId.startsWith('run-')).toBe(true);
		expect(path.dirname(runHome.home)).toBe(runsRoot);
	});
});

describe('cleanupRunHome', () => {
	it('removes the whole run home and is idempotent', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-runhome-runs-');
		const runHome = await createRunHome({ baseHome, runsRoot, runId: 'run-cleanup' });
		await writeFile(path.join(runHome.home, 'history.jsonl'), '{"x":1}\n', 'utf8');
		await cleanupRunHome(runHome);
		expect(existsSync(runHome.home)).toBe(false);
		await cleanupRunHome(runHome);
		await cleanupRunHome(runHome.home);
	});
});

describe('cleanupStaleRunHomes', () => {
	it('removes only homes older than the TTL', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-runhome-runs-');
		const oldHome = await createRunHome({ baseHome, runsRoot, runId: 'run-old' });
		const freshHome = await createRunHome({ baseHome, runsRoot, runId: 'run-fresh' });
		const nowMs = Date.now();
		const oldTime = new Date(nowMs - 25 * 60 * 60 * 1_000);
		await utimes(oldHome.home, oldTime, oldTime);
		const result = await cleanupStaleRunHomes({
			runsRoot,
			staleTtlMs: 24 * 60 * 60 * 1_000,
			now: () => nowMs,
		});
		expect(result.scanned).toBe(2);
		expect(result.removed).toEqual([oldHome.home]);
		expect(result.kept).toBe(1);
		expect(existsSync(oldHome.home)).toBe(false);
		expect(existsSync(freshHome.home)).toBe(true);
	});

	it('returns an empty result when the runs root is missing', async () => {
		const result = await cleanupStaleRunHomes({
			runsRoot: path.join(await makeTempDir('pong-runhome-missing-'), 'absent'),
		});
		expect(result).toEqual({ scanned: 0, removed: [], kept: 0, failed: [] });
	});

	it('ignores directories that are not run homes', async () => {
		const runsRoot = await makeTempDir('pong-runhome-runs-');
		await writeFile(path.join(runsRoot, 'not-a-run.txt'), 'x', 'utf8');
		const result = await cleanupStaleRunHomes({
			runsRoot,
			now: () => Date.now() + 10 * 365 * 24 * 3_600_000,
		});
		expect(result.scanned).toBe(0);
		const entries = await readdir(runsRoot);
		expect(entries).toContain('not-a-run.txt');
	});
});

describe('home resolution', () => {
	it('prefers EASYCODE_HOME and PONG_EASYCODE_RUNS_ROOT', async () => {
		const baseHome = await makeBaseHome();
		const runsRoot = await makeTempDir('pong-runhome-runs-');
		expect(resolveEasyCodeBaseHome({ EASYCODE_HOME: baseHome })).toBe(baseHome);
		expect(resolveRunHomesRoot({ PONG_EASYCODE_RUNS_ROOT: runsRoot })).toBe(runsRoot);
		const fallbackBase = resolveEasyCodeBaseHome({});
		expect(path.basename(fallbackBase)).toBe('.easycode');
		expect(path.basename(resolveRunHomesRoot({}))).toBe('pong-easycode-runs');
	});
});
