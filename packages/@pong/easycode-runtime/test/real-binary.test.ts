import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	AppServerSupervisor,
	JsonlTransport,
	RemoteProtocolError,
	parseInitializeResponse,
	parseThreadStartResponse,
	resolveDefaultExePath,
} from '../src/index';

const REAL_EXE = process.env.EASYCODE_EXE ?? resolveDefaultExePath();
const HAS_REAL_BINARY = REAL_EXE !== null && existsSync(REAL_EXE);
const SKIP_REAL_CONTRACT = process.env.PONG_SKIP_REAL_CONTRACT === '1';
const CONTRACT_TIMEOUT_MS = 180_000;

function requireRealExe(): string {
	if (REAL_EXE === null) throw new Error('real easyCode binary is not available');
	return REAL_EXE;
}

function parseAny(value: unknown): unknown {
	return value;
}

async function copyRealHomeFiles(targetHome: string): Promise<void> {
	const sourceHome =
		process.env.EASYCODE_HOME ?? path.join(process.env.USERPROFILE ?? '', '.easycode');
	await mkdir(targetHome, { recursive: true });
	for (const fileName of ['config.toml', 'auth.json', 'installation_id']) {
		try {
			await copyFile(path.join(sourceHome, fileName), path.join(targetHome, fileName));
		} catch {
			// Optional seed file for this machine.
		}
	}
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
	return await new Promise((resolve) => {
		if (child.exitCode !== null || child.signalCode !== null) {
			resolve(true);
			return;
		}
		const timer = setTimeout(() => {
			child.off('exit', onExit);
			resolve(false);
		}, timeoutMs);
		const onExit = (): void => {
			clearTimeout(timer);
			resolve(true);
		};
		child.once('exit', onExit);
	});
}

async function stopRawChild(child: ChildProcess): Promise<void> {
	child.stdin?.end();
	const exited = await waitForExit(child, 5_000);
	if (!exited) child.kill();
}

/**
 * Windows keeps SQLite and rollout handles briefly after the process exits
 * (see m0-fault-injection F5). Retry, then leave the temp dir in place.
 */
async function safeRemove(dir: string): Promise<void> {
	try {
		await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
	} catch {
		// Temporary directory only.
	}
}

/**
 * These tests need a real easyCode binary and model credentials. They skip when
 * the binary is missing or PONG_SKIP_REAL_CONTRACT=1 is set (CI without the
 * portable build).
 */
describe.skipIf(!HAS_REAL_BINARY || SKIP_REAL_CONTRACT)('real easyCode binary contract', () => {
	it(
		'accepts workspaceWrite.networkAccess as a boolean',
		async () => {
			const home = await mkdtemp(path.join(tmpdir(), 'pong-contract-home-'));
			const cwd = await mkdtemp(path.join(tmpdir(), 'pong-contract-cwd-'));
			await copyRealHomeFiles(home);
			const supervisor = new AppServerSupervisor({
				exePath: requireRealExe(),
				cwd,
				env: { ...process.env, EASYCODE_HOME: home },
				homeMode: 'shared',
				easycodeHome: home,
				logger: { debug: () => undefined, warn: () => undefined, error: () => undefined },
				events: { onApprovalRequest: () => 'accept' },
			});
			try {
				await supervisor.start();
				const thread = await supervisor.startThread({ cwd, approvalPolicy: 'on-request' });
				const started = await supervisor.startTurn(
					thread.thread.id,
					'Reply with the single word OK.',
					{
						sandboxPolicy: {
							type: 'workspaceWrite',
							writableRoots: [cwd],
							networkAccess: false,
							excludeTmpdirEnvVar: false,
							excludeSlashTmp: true,
						},
					},
				);
				const completed = await supervisor.waitForTurnCompleted(started.turn.id, 120_000);
				expect(completed.params).toMatchObject({
					turn: { id: started.turn.id, status: 'completed' },
				});
			} finally {
				await supervisor.shutdown();
				await safeRemove(home);
				await safeRemove(cwd);
			}
		},
		CONTRACT_TIMEOUT_MS,
	);

	it(
		'rejects a string networkAccess with a readable error',
		async () => {
			const home = await mkdtemp(path.join(tmpdir(), 'pong-contract-home-'));
			const cwd = await mkdtemp(path.join(tmpdir(), 'pong-contract-cwd-'));
			await copyRealHomeFiles(home);
			const child = spawn(requireRealExe(), ['app-server', '--listen', 'stdio://'], {
				cwd,
				env: { ...process.env, EASYCODE_HOME: home },
				stdio: ['pipe', 'pipe', 'pipe'],
				windowsHide: true,
			});
			try {
				if (child.stdin === null || child.stdout === null) {
					throw new Error('app-server stdio streams are unavailable');
				}
				const transport = new JsonlTransport({
					input: child.stdout,
					output: child.stdin,
					defaultRequestTimeoutMs: 60_000,
				});
				await transport.request(
					'initialize',
					{
						clientInfo: { name: 'pong-contract', title: null, version: '0.1.0' },
						capabilities: { experimentalApi: true, requestAttestation: false },
					},
					parseInitializeResponse,
				);
				transport.notify('initialized');
				const thread = await transport.request(
					'thread/start',
					{ cwd, approvalPolicy: 'on-request' },
					parseThreadStartResponse,
				);
				const rejection = transport
					.request(
						'turn/start',
						{
							threadId: thread.thread.id,
							input: [{ type: 'text', text: 'Reply with the single word OK.', text_elements: [] }],
							sandboxPolicy: {
								type: 'workspaceWrite',
								writableRoots: [cwd],
								// Deliberately wrong wire shape: the server expects a boolean.
								networkAccess: 'restricted',
								excludeTmpdirEnvVar: false,
								excludeSlashTmp: true,
							},
						},
						parseAny,
					)
					.catch((error: unknown) => error);
				const error = await rejection;
				expect(error).toBeInstanceOf(RemoteProtocolError);
				const message = error instanceof Error ? error.message.toLowerCase() : '';
				expect(message).toContain('invalid');
				expect(message).toContain('boolean');
				transport.close('contract test done');
			} finally {
				await stopRawChild(child);
				await safeRemove(home);
				await safeRemove(cwd);
			}
		},
		CONTRACT_TIMEOUT_MS,
	);
});
