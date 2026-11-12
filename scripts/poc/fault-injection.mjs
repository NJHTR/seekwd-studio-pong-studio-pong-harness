#!/usr/bin/env node
// M0 fault injection for the easyCode app-server contract (ADR-001 §5.3/§5.4).
//
// Scenarios:
//   readloop-pause    Host read loop paused 30s (GC/database stall) while an
//                     approval request is in flight. The request must not be
//                     lost and must still be answerable after the pause.
//   approval-timeout  Host leaves an approval pending. The 120s broker deadline
//                     must decline it and record an audit entry.
//   interrupt         turn/interrupt, a repeat interrupt on the ended turn, and
//                     an interrupt on a naturally completed turn. The real M0
//                     binary stays silent; the host must use the 5s fallback.
//   resume-no-rollout thread/resume on a thread with no rollout must fail
//                     cleanly and must not damage the supervisor. Also covers
//                     resume after the workspace directory is removed.
//   concurrent-home   4 app-server processes share one isolated EASYCODE_HOME
//                     and write for 10 minutes. Records turn failures, busy
//                     retries, SQLite/WAL growth, and memory.
//
// Usage:
//   node scripts/poc/fault-injection.mjs --scenario all
//   node scripts/poc/fault-injection.mjs --scenario all --smoke
//   node scripts/poc/fault-injection.mjs --scenario concurrent-home --stress-minutes 10
//
// `--smoke` uses fake-app-server.mjs (deterministic, no model, no easycode.exe)
// and scaled-down timings. It is the CI entry point. Real runs need Node 24 and
// the easycode binary; the binary version is checked before any run.

import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
	ARTIFACTS_DIR,
	DEFAULT_EXE,
	FAKE_SERVER_PATH,
	Harness,
	Recorder,
	REAL_EASYCODE_HOME,
	blockEventLoop,
	delay,
	makeTempDir,
	nowIso,
	parseArgs,
	probeVersion,
	readDirectorySizes,
	readProcessMemory,
	runId,
	seedIsolatedHome,
	writeJsonFile,
	writeJsonLines,
} from './poc-lib.mjs';

const READ_ONLY_SANDBOX = { type: 'readOnly', networkAccess: false };
const WORKSPACE_WRITE_SANDBOX = (root) => ({
	type: 'workspaceWrite',
	writableRoots: [root],
	networkAccess: 'restricted',
	excludeTmpdirEnvVar: false,
	excludeSlashTmp: true,
});
const SCENARIOS = [
	'readloop-pause',
	'approval-timeout',
	'interrupt',
	'resume-no-rollout',
	'concurrent-home',
];

const DEFAULT_ARGS = {
	scenario: 'all',
	smoke: false,
	exe: process.env.EASYCODE_EXE ?? DEFAULT_EXE,
	outDir: null,
	readPauseMs: 30_000,
	approvalTimeoutMs: 120_000,
	interruptWaitMs: 2_500,
	secondInterruptTimeoutMs: 5_000,
	turnTimeoutMs: 300_000,
	stressMinutes: 10,
	stressIntervalMs: 10_000,
	stressProcesses: 4,
	stressTurnTimeoutMs: 120_000,
	home: null,
	keepHome: false,
	help: false,
};

function printHelp() {
	console.log(`M0 fault injection for the easyCode app-server contract.

  --scenario <all|faults|${SCENARIOS.join('|')}>   Default: all (faults excludes the stress run)
  --smoke                                Use fake-app-server.mjs, scaled timings
  --exe <path>                           easycode.exe (default: EASYCODE_EXE or M0 path)
  --out-dir <path>                       Artifact dir (default: scripts/poc/.artifacts/fault-<id>)
  --read-pause-ms <n>                    Read-loop pause. Default: 30000
  --approval-timeout-ms <n>              Approval deadline. Default: 120000
  --interrupt-wait-ms <n>                Delay before the first interrupt. Default: 2500
  --second-interrupt-timeout-ms <n>      Repeat-interrupt host timeout. Default: 5000
  --turn-timeout-ms <n>                  Per-turn completion timeout. Default: 300000
  --stress-minutes <n>                   Concurrent-home duration. Default: 10
  --stress-interval-ms <n>               Slot interval. Default: 10000
  --stress-processes <n>                 Processes. Default: 4
  --stress-turn-timeout-ms <n>           Stress turn timeout. Default: 120000
  --home <path>                          EASYCODE_HOME for the stress scenario
  --keep-home                            Keep the isolated EASYCODE_HOME`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2), DEFAULT_ARGS);
	if (args.help) {
		printHelp();
		process.exit(0);
	}
	const scenarios =
		args.scenario === 'all'
			? SCENARIOS
			: args.scenario === 'faults'
				? SCENARIOS.slice(0, 4)
				: [args.scenario];
	for (const scenario of scenarios) {
		if (!SCENARIOS.includes(scenario)) throw new Error(`unknown scenario: ${scenario}`);
	}

	const id = runId();
	const outDir = path.resolve(
		args.outDir ?? path.join(ARTIFACTS_DIR, `${args.smoke ? 'fault-smoke' : 'fault'}-${id}`),
	);
	const profile = buildProfile(args);
	const summary = {
		meta: {
			startedAt: nowIso(),
			runId: id,
			node: process.version,
			platform: `${process.platform}-${process.arch}`,
			kind: profile.kind,
			exe: profile.kind === 'smoke' ? `${process.execPath} ${FAKE_SERVER_PATH}` : args.exe,
			version: null,
			script: 'fault-injection.mjs',
			args,
			outDir,
		},
		sharedHome: null,
		scenarios: {},
		failures: [],
	};
	await writeJsonFile(path.join(outDir, 'meta.json'), summary.meta);

	if (profile.kind === 'real') {
		summary.meta.version = await probeVersion(args.exe);
		console.log(`[fault] easycode: ${summary.meta.version}`);
		if (summary.meta.version === 'unavailable') {
			throw new Error(`easycode binary is not runnable: ${args.exe}`);
		}
	}

	// One isolated home for the fault scenarios. The stress scenario creates its
	// own home, because it must be shared by 4 processes.
	const faultsRun = scenarios.some((scenario) => scenario !== 'concurrent-home');
	let faultHome = null;
	if (faultsRun) {
		if (profile.kind === 'smoke') {
			faultHome = await makeTempDir('poc-fault-home-');
		} else {
			const seeded = await seedIsolatedHome();
			faultHome = seeded.home;
			summary.sharedHome = {
				path: faultHome,
				seeded: seeded.seeded,
				mode: 'isolated for fault scenarios',
			};
			console.log(`[fault] isolated EASYCODE_HOME: ${faultHome}`);
		}
	}

	let exitCode = 0;
	for (const [index, scenario] of scenarios.entries()) {
		const label = `[${index + 1}/${scenarios.length}] ${scenario}`;
		process.stdout.write(`${label} ... `);
		const scenarioDir = path.join(outDir, scenario);
		const startedAt = Date.now();
		let result;
		try {
			result = await runScenario(scenario, {
				args,
				profile,
				outDir: scenarioDir,
				home: faultHome,
				summary,
			});
		} catch (error) {
			result = {
				name: scenario,
				status: 'error',
				error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
				stack: error instanceof Error ? error.stack : null,
				checks: [],
				durationMs: Date.now() - startedAt,
			};
			summary.failures.push({ scenario, message: result.error });
		}
		result.durationMs = Date.now() - startedAt;
		summary.scenarios[scenario] = result;
		const passed = result.checks.filter((check) => check.ok).length;
		console.log(
			`${result.status.toUpperCase()} (${passed}/${result.checks.length} checks, ${result.durationMs} ms)`,
		);
		for (const check of result.checks) {
			if (!check.ok) console.log(`    FAIL ${check.name}: ${check.detail ?? ''}`);
		}
		if (result.status !== 'pass') exitCode = 1;
		await writeJsonFile(path.join(outDir, `${scenario}.json`), result);
	}

	summary.meta.finishedAt = nowIso();
	summary.meta.durationMs =
		Date.parse(summary.meta.finishedAt) - Date.parse(summary.meta.startedAt);
	await writeJsonFile(path.join(outDir, 'summary.json'), summary);

	if (!args.keepHome && faultHome !== null)
		await rm(faultHome, { recursive: true, force: true }).catch(() => undefined);

	console.log('\n=== fault-injection summary ===');
	for (const [name, result] of Object.entries(summary.scenarios)) {
		const passed = result.checks.filter((check) => check.ok).length;
		console.log(
			`${result.status === 'pass' ? 'PASS' : 'FAIL'}  ${name.padEnd(18)} ${passed}/${result.checks.length} checks`,
		);
	}
	console.log(`\nArtifacts: ${outDir}`);
	if (summary.failures.length > 0) {
		console.log('Failures:');
		for (const failure of summary.failures)
			console.log(`  - ${failure.scenario}: ${failure.message}`);
	}
	if (exitCode !== 0) process.exitCode = 1;
}

function buildProfile(args) {
	if (!args.smoke) {
		return {
			kind: 'real',
			exePath: args.exe,
			readPauseMs: args.readPauseMs,
			approvalTimeoutMs: args.approvalTimeoutMs,
			interruptWaitMs: args.interruptWaitMs,
			secondInterruptTimeoutMs: args.secondInterruptTimeoutMs,
			turnTimeoutMs: args.turnTimeoutMs,
			stress: {
				minutes: args.stressMinutes,
				intervalMs: args.stressIntervalMs,
				processes: args.stressProcesses,
				turnTimeoutMs: args.stressTurnTimeoutMs,
			},
		};
	}
	return {
		kind: 'smoke',
		readPauseMs: 1_200,
		approvalTimeoutMs: 800,
		interruptWaitMs: 300,
		secondInterruptTimeoutMs: 600,
		turnTimeoutMs: 20_000,
		stress: {
			minutes: 4 / 60,
			intervalMs: 400,
			processes: 4,
			turnTimeoutMs: 10_000,
		},
	};
}

function fakeOptions(mode, extraEnv = {}) {
	return {
		exePath: process.execPath,
		appServerArgs: [FAKE_SERVER_PATH],
		env: { ...process.env, FAKE_MODE: mode, FAKE_USAGE: '1', ...extraEnv },
	};
}

function realOptions(profile, home) {
	if (profile.kind === 'smoke') return fakeOptions('approval');
	return {
		exePath: profile.exePath,
		env: { ...process.env, EASYCODE_HOME: home },
	};
}

function harnessOptions(ctx, mode) {
	const base =
		ctx.profile.kind === 'smoke' ? fakeOptions(mode) : realOptions(ctx.profile, ctx.home);
	if (ctx.profile.kind === 'smoke' && (mode === 'interrupt' || mode === 'slow-turn')) {
		base.env = { ...base.env, FAKE_TURN_MS: '2000' };
	}
	return {
		exePath: base.exePath,
		appServerArgs: base.appServerArgs,
		env: base.env,
		requestTimeoutMs: 60_000,
	};
}

function makeChecks() {
	const checks = [];
	return {
		checks,
		add(name, ok, detail = null) {
			checks.push({ name, ok: ok === true, detail });
			return ok === true;
		},
		status() {
			return checks.every((check) => check.ok) ? 'pass' : 'fail';
		},
	};
}

async function runScenario(scenario, ctx) {
	if (scenario === 'readloop-pause') return await scenarioReadLoopPause(ctx);
	if (scenario === 'approval-timeout') return await scenarioApprovalTimeout(ctx);
	if (scenario === 'interrupt') return await scenarioInterrupt(ctx);
	if (scenario === 'resume-no-rollout') return await scenarioResumeNoRollout(ctx);
	return await scenarioConcurrentHome(ctx);
}

/** Create a harness, start it, and always shut it down at the end. */
async function withHarness(ctx, mode, events, body) {
	const recorder = new Recorder(ctx.outDir);
	const harness = new Harness({
		...harnessOptions(ctx, mode),
		cwd: ctx.cwd,
		outDir: ctx.outDir,
		recorder,
		approvalTimeoutMs: ctx.profile.approvalTimeoutMs,
		events,
	});
	const result = { recorder, harness, initialize: null, shutdown: null, error: null };
	try {
		result.initialize = await harness.start();
		result.body = await body(harness, recorder);
	} catch (error) {
		result.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
	} finally {
		try {
			result.shutdown = await harness.shutdown();
		} catch (error) {
			result.shutdown = { error: error instanceof Error ? error.message : String(error) };
		}
		recorder.close();
	}
	if (result.error !== null) throw new Error(result.error);
	return result;
}

function turnSummary(turn) {
	return {
		turnId: turn.turnId,
		status: turn.status,
		durationMs: turn.durationMs,
		wallMs: turn.wallMs,
		error: turn.error,
		timeoutError: turn.timeoutError,
		agentText: turn.agentText,
		usage: turn.usage,
		items: turn.items,
	};
}

function transportSummary(harness) {
	const stats = harness.health().transport;
	return {
		inboundMessages: stats.inboundMessages,
		outboundMessages: stats.outboundMessages,
		notificationsQueued: stats.notificationsQueued,
		notificationsDropped: stats.notificationsDropped,
		protocolErrors: stats.protocolErrors,
		pendingRequests: stats.pendingRequests,
	};
}

// ---------------------------------------------------------------------------
// S1: read loop paused while an approval request is in flight
// ---------------------------------------------------------------------------
async function scenarioReadLoopPause(ctx) {
	ctx.cwd = await makeTempDir('poc-readloop-');
	const { writeFile } = await import('node:fs/promises');
	await writeFile(path.join(ctx.cwd, 'readloop-input.txt'), 'readloop-ok\n', 'utf8');

	const checks = makeChecks();
	const pause = {
		requestedMs: ctx.profile.readPauseMs,
		blockedMs: null,
		startedAt: null,
		endedAt: null,
	};
	let paused = false;
	let approvalEntry = null;
	const decisions = [];

	const outcome = await withHarness(
		ctx,
		'approval',
		{
			onNotification: (notification) => {
				if (paused || notification.method !== 'turn/started') return;
				paused = true;
				pause.startedAt = nowIso();
				pause.blockedMs = blockEventLoop(ctx.profile.readPauseMs);
				pause.endedAt = nowIso();
			},
			onApprovalRequest: (request) => {
				approvalEntry = {
					...request,
					hostReceivedAt: nowIso(),
					hostReceivedAtMs: Date.now(),
					pauseEndedAtMs: pause.endedAt === null ? null : Date.parse(pause.endedAt),
				};
				decisions.push({
					approvalId: request.approvalId,
					decision: 'accept',
					note: 'answered after read-loop pause',
				});
				return 'accept';
			},
		},
		async (harness) => {
			const thread = await harness.startThread({
				cwd: ctx.cwd,
				approvalPolicy: 'on-request',
				sandbox: 'workspace-write',
				ephemeral: false,
			});
			const turn = await harness.runTurn(
				'Read the file readloop-input.txt in the current directory. Reply with its exact content.',
				{
					approvalPolicy: 'untrusted',
					sandboxPolicy: READ_ONLY_SANDBOX,
					timeoutMs: ctx.profile.turnTimeoutMs,
				},
			);
			return {
				threadId: thread.thread.id,
				turn: turnSummary(turn),
				approvalEntry,
				decisions,
				pause,
				transport: transportSummary(harness),
				pendingApprovalsAfter: harness.supervisor.approvals.pendingCount,
				stats: harness.supervisor.approvals.stats,
			};
		},
	);

	const body = outcome.body;
	const turn = body.turn;
	checks.add('event loop was paused', paused === true, `paused=${paused}`);
	checks.add(
		'pause duration reached the configured value',
		typeof body.pause.blockedMs === 'number' &&
			body.pause.blockedMs >= ctx.profile.readPauseMs - 20,
		`blockedMs=${body.pause.blockedMs} requested=${ctx.profile.readPauseMs}`,
	);
	checks.add(
		'approval request was received after the pause ended',
		body.approvalEntry !== null,
		JSON.stringify(body.approvalEntry?.approvalId ?? null),
	);
	checks.add(
		'approval arrived only after the read loop resumed',
		typeof body.approvalEntry?.hostReceivedAtMs === 'number' &&
			body.pause.endedAt !== null &&
			body.approvalEntry.hostReceivedAtMs >= Date.parse(body.pause.endedAt),
		JSON.stringify({
			hostReceivedAtMs: body.approvalEntry?.hostReceivedAtMs,
			pauseEndedAt: body.pause.endedAt,
		}),
	);
	checks.add(
		'approval was answered (not lost)',
		body.decisions.length === 1 && body.decisions[0].decision === 'accept',
		JSON.stringify(body.decisions),
	);
	checks.add('turn reached a terminal notification', turn.status !== null, `status=${turn.status}`);
	checks.add(
		'turn status is completed',
		turn.status === 'completed',
		`status=${turn.status} timeout=${turn.timeoutError} error=${JSON.stringify(turn.error)}`,
	);
	checks.add(
		'command approval produced a completed command item',
		turn.items.some((item) => item.type === 'commandExecution' && item.status === 'completed'),
		JSON.stringify(turn.items),
	);
	checks.add(
		'no protocol errors',
		body.transport.protocolErrors === 0,
		`protocolErrors=${body.transport.protocolErrors}`,
	);
	checks.add(
		'no notifications dropped',
		body.transport.notificationsDropped === 0,
		`dropped=${body.transport.notificationsDropped}`,
	);
	if (ctx.profile.kind === 'real') {
		checks.add(
			'file content reached the agent',
			turn.agentText.includes('readloop-ok'),
			`agentText=${JSON.stringify(turn.agentText.slice(0, 200))}`,
		);
	}
	checks.add(
		'no approval left pending',
		body.pendingApprovalsAfter === 0,
		`pending=${body.pendingApprovalsAfter}`,
	);
	return {
		name: 'readloop-pause',
		status: checks.status(),
		checks: checks.checks,
		metrics: {
			pause: body.pause,
			approval: body.approvalEntry,
			turn,
			transport: body.transport,
			approvalStats: body.stats,
			shutdown: outcome.shutdown,
		},
	};
}

// ---------------------------------------------------------------------------
// S2: 120s approval timeout -> decline + audit
// ---------------------------------------------------------------------------
async function scenarioApprovalTimeout(ctx) {
	ctx.cwd = await makeTempDir('poc-approval-timeout-');
	const { writeFile } = await import('node:fs/promises');
	await writeFile(path.join(ctx.cwd, 'timeout-input.txt'), 'timeout-content\n', 'utf8');

	const checks = makeChecks();
	const requestedAt = { ms: null, iso: null };
	const decisions = [];

	const outcome = await withHarness(
		ctx,
		'approval',
		{
			onApprovalRequest: (request) => {
				requestedAt.ms = Date.now();
				requestedAt.iso = nowIso();
				// Deliberately do not decide: the broker deadline must decline it.
				return undefined;
			},
		},
		async (harness) => {
			const thread = await harness.startThread({
				cwd: ctx.cwd,
				approvalPolicy: 'on-request',
				sandbox: 'workspace-write',
				ephemeral: false,
			});
			const turn = await harness.runTurn(
				'Read the file timeout-input.txt in the current directory. Reply with its exact content.',
				{
					approvalPolicy: 'untrusted',
					sandboxPolicy: READ_ONLY_SANDBOX,
					timeoutMs:
						ctx.profile.approvalTimeoutMs + (ctx.profile.kind === 'smoke' ? 5_000 : 120_000),
				},
			);
			// Give the broker timer a chance to settle and the server to answer.
			await delay(200);
			const records = [...harness.supervisor.approvals.records];
			const stats = harness.supervisor.approvals.stats;
			await writeJsonLines(
				path.join(ctx.outDir, 'audit.jsonl'),
				records.map((record) => ({ ...record, recordedAt: nowIso() })),
			);
			return {
				threadId: thread.thread.id,
				turn: turnSummary(turn),
				records,
				stats,
				decisions,
				requestedAt,
				transport: transportSummary(harness),
				timeoutWarnings: harness.recorder.progress.filter((entry) =>
					entry.message.includes('timed out'),
				),
			};
		},
	);

	const body = outcome.body;
	const turn = body.turn;
	const record = body.records.at(-1) ?? null;
	const approvalItem = turn.items.find((item) => item.type === 'commandExecution') ?? null;
	checks.add(
		'an approval request was received',
		body.requestedAt.iso !== null,
		JSON.stringify(body.requestedAt),
	);
	checks.add('the broker recorded a decision', record !== null, JSON.stringify(record));
	checks.add('decision is decline', record?.decision === 'decline', `decision=${record?.decision}`);
	checks.add(
		'record is marked as a timeout',
		record?.timedOut === true,
		`timedOut=${record?.timedOut}`,
	);
	checks.add(
		'round trip is at least the configured deadline',
		typeof record?.roundtripMs === 'number' &&
			record.roundtripMs >= ctx.profile.approvalTimeoutMs - 50,
		`roundtripMs=${record?.roundtripMs} deadline=${ctx.profile.approvalTimeoutMs}`,
	);
	checks.add('stats counted one timeout', body.stats.timedOut >= 1, JSON.stringify(body.stats));
	checks.add(
		'the timeout emitted a warning log line',
		body.timeoutWarnings.length >= 1,
		JSON.stringify(body.timeoutWarnings),
	);
	checks.add('turn reached a terminal notification', turn.status !== null, `status=${turn.status}`);
	checks.add(
		'no protocol errors',
		body.transport.protocolErrors === 0,
		`protocolErrors=${body.transport.protocolErrors}`,
	);
	checks.add(
		'no approval left pending',
		harnessPending(body.stats) === 0,
		`pending=${body.stats.pending}`,
	);
	if (ctx.profile.kind === 'smoke') {
		checks.add(
			'declined command item is recorded',
			approvalItem?.status === 'declined',
			JSON.stringify(approvalItem),
		);
	}
	checks.add(
		'audit record has the approval ids',
		typeof record?.approvalId === 'string' && typeof record?.turnId === 'string',
		JSON.stringify({ approvalId: record?.approvalId, turnId: record?.turnId }),
	);
	return {
		name: 'approval-timeout',
		status: checks.status(),
		checks: checks.checks,
		metrics: {
			requestedAt: body.requestedAt,
			auditRecords: body.records,
			approvalStats: body.stats,
			turn,
			timeoutWarnings: body.timeoutWarnings,
			shutdown: outcome.shutdown,
		},
	};
}

function harnessPending(stats) {
	return stats.pending ?? 0;
}

// ---------------------------------------------------------------------------
// S3: interrupt, repeat interrupt on an ended turn, natural completion
// ---------------------------------------------------------------------------
async function scenarioInterrupt(ctx) {
	ctx.cwd = await makeTempDir('poc-interrupt-');
	const { writeFile } = await import('node:fs/promises');
	for (let i = 0; i < 6; i += 1) {
		await writeFile(path.join(ctx.cwd, `interrupt-${i}.txt`), `line ${i}\n`, 'utf8');
	}

	const checks = makeChecks();
	const measurement = {
		interrupt: null,
		repeatInterrupt: null,
		interruptAfterNaturalCompletion: null,
		postInterruptTurn: null,
		initialPid: null,
		finalPid: null,
	};

	const outcome = await withHarness(ctx, 'interrupt', {}, async (harness) => {
		const thread = await harness.startThread({
			cwd: ctx.cwd,
			approvalPolicy: 'on-request',
			sandbox: 'workspace-write',
			ephemeral: false,
		});
		measurement.initialPid = harness.health().pid;

		const interruptTurn = await harness.startTurn(
			[
				'This is an interrupt probe.',
				'List every file in the current directory, read every file, and summarize each one.',
				'Keep working until you are stopped.',
			].join('\n'),
			{ sandboxPolicy: READ_ONLY_SANDBOX },
		);
		await delay(ctx.profile.interruptWaitMs);
		const firstDecisionAt = Date.now();
		const first = await harness.interrupt(thread.thread.id, interruptTurn.turnId, 15_000);
		const firstTerminal = await harness
			.waitForTurn(interruptTurn.turnId, 30_000)
			.catch((error) => ({
				params: { turn: { id: interruptTurn.turnId, status: 'timeout', error: error.message } },
			}));
		measurement.interrupt = {
			turnId: interruptTurn.turnId,
			status: firstTerminal.params?.turn?.status ?? null,
			interruptOutcome: first,
			decisionToResponseMs: Date.now() - firstDecisionAt,
		};

		const repeatStartedAt = Date.now();
		const repeat = await harness.interrupt(
			thread.thread.id,
			interruptTurn.turnId,
			ctx.profile.secondInterruptTimeoutMs,
		);
		measurement.repeatInterrupt = {
			outcome: repeat,
			elapsedMs: Date.now() - repeatStartedAt,
			pidUnchanged: harness.health().pid === measurement.initialPid,
		};

		const natural = await harness.runTurn('Reply with the single word OK.', {
			sandboxPolicy: READ_ONLY_SANDBOX,
			timeoutMs: ctx.profile.turnTimeoutMs,
		});
		const afterNaturalStartedAt = Date.now();
		const afterNatural = await harness.interrupt(
			thread.thread.id,
			natural.turnId,
			ctx.profile.secondInterruptTimeoutMs,
		);
		measurement.interruptAfterNaturalCompletion = {
			turnId: natural.turnId,
			turnStatus: natural.status,
			outcome: afterNatural,
			elapsedMs: Date.now() - afterNaturalStartedAt,
		};

		const post = await harness.runTurn('Reply with the single word OK.', {
			sandboxPolicy: READ_ONLY_SANDBOX,
			timeoutMs: ctx.profile.turnTimeoutMs,
		});
		measurement.postInterruptTurn = turnSummary(post);
		measurement.finalPid = harness.health().pid;
		measurement.health = harness.health();
		measurement.healthOk = harness.health().ok;
		return { threadId: thread.thread.id };
	});

	const first = measurement.interrupt;
	const naturalInterrupt = measurement.interruptAfterNaturalCompletion;
	checks.add(
		'active-turn interrupt returned a response',
		first?.interruptOutcome?.status === 'interrupted',
		JSON.stringify(first?.interruptOutcome),
	);
	checks.add(
		'interrupted turn ended with status interrupted',
		first?.status === 'interrupted',
		`status=${first?.status}`,
	);
	checks.add(
		'repeat interrupt on the ended turn used the host timeout fallback',
		measurement.repeatInterrupt?.outcome?.status === 'no-response' ||
			measurement.repeatInterrupt?.outcome?.status === 'no-active-turn',
		JSON.stringify(measurement.repeatInterrupt),
	);
	if (ctx.profile.kind === 'real') {
		checks.add(
			'the real binary stayed silent (no no-active-turn error)',
			measurement.repeatInterrupt?.outcome?.status === 'no-response',
			`status=${measurement.repeatInterrupt?.outcome?.status} detail=${measurement.repeatInterrupt?.outcome?.detail}`,
		);
	}
	checks.add(
		'the fallback waited at least most of the configured timeout',
		typeof measurement.repeatInterrupt?.elapsedMs === 'number' &&
			measurement.repeatInterrupt.elapsedMs >= ctx.profile.secondInterruptTimeoutMs - 100,
		`elapsedMs=${measurement.repeatInterrupt?.elapsedMs} timeout=${ctx.profile.secondInterruptTimeoutMs}`,
	);
	checks.add(
		'interrupt on a naturally completed turn also used the fallback',
		naturalInterrupt?.outcome?.status === 'no-response' ||
			naturalInterrupt?.outcome?.status === 'no-active-turn',
		JSON.stringify(naturalInterrupt),
	);
	checks.add(
		'the process was not restarted',
		measurement.repeatInterrupt?.pidUnchanged === true &&
			measurement.finalPid === measurement.initialPid,
		JSON.stringify({ initialPid: measurement.initialPid, finalPid: measurement.finalPid }),
	);
	checks.add(
		'health check is ok after the interrupts',
		measurement.healthOk === true,
		JSON.stringify(measurement.health),
	);
	checks.add(
		'a new turn works after the interrupts',
		measurement.postInterruptTurn?.status === 'completed',
		`status=${measurement.postInterruptTurn?.status} error=${measurement.postInterruptTurn?.timeoutError}`,
	);
	return {
		name: 'interrupt',
		status: checks.status(),
		checks: checks.checks,
		metrics: { ...measurement, shutdown: outcome.shutdown },
	};
}

// ---------------------------------------------------------------------------
// S4: resume without a rollout; resume after the workspace is removed
// ---------------------------------------------------------------------------
async function scenarioResumeNoRollout(ctx) {
	ctx.cwd = await makeTempDir('poc-resume-');
	const checks = makeChecks();
	const measurement = {
		noRolloutError: null,
		noRolloutErrorClass: null,
		postErrorTurn: null,
		workspaceRemoved: null,
		healthAfter: null,
	};

	const outcome = await withHarness(ctx, 'resume-no-rollout', {}, async (harness) => {
		const thread = await harness.startThread({
			cwd: ctx.cwd,
			approvalPolicy: 'on-request',
			sandbox: 'workspace-write',
			ephemeral: false,
		});
		// Fresh thread: the server has no rollout yet, so resume must fail.
		try {
			await harness.resumeThread({ threadId: thread.thread.id, excludeTurns: true });
			measurement.noRolloutError = null;
		} catch (error) {
			measurement.noRolloutError = error instanceof Error ? error.message : String(error);
			measurement.noRolloutErrorClass = error instanceof Error ? error.name : typeof error;
			measurement.noRolloutErrorCode = error?.code ?? null;
		}

		const post = await harness.runTurn('Reply with the single word OK.', {
			sandboxPolicy: READ_ONLY_SANDBOX,
			timeoutMs: ctx.profile.turnTimeoutMs,
		});
		measurement.postErrorTurn = turnSummary(post);

		// Second thread: complete a turn (creates a rollout), then remove the
		// workspace contents before resume. The root directory stays because
		// the server keeps a handle on it while it is the thread workspace.
		const secondCwd = await makeTempDir('poc-resume-ws-');
		const { mkdir, writeFile } = await import('node:fs/promises');
		await mkdir(path.join(secondCwd, 'src'), { recursive: true });
		await writeFile(path.join(secondCwd, 'keep.txt'), 'keep\n', 'utf8');
		await writeFile(path.join(secondCwd, 'src', 'a.txt'), 'a\n', 'utf8');
		const second = await harness.startThread({
			cwd: secondCwd,
			approvalPolicy: 'on-request',
			sandbox: 'workspace-write',
			ephemeral: false,
		});
		const warmup = await harness.runTurn('Reply with the single word OK.', {
			threadId: second.thread.id,
			sandboxPolicy: READ_ONLY_SANDBOX,
			timeoutMs: ctx.profile.turnTimeoutMs,
		});
		let workspaceRemoveError = null;
		let removedContents = false;
		for (let attempt = 0; attempt < 5; attempt += 1) {
			try {
				await rm(path.join(secondCwd, 'src'), { recursive: true, force: true });
				await rm(path.join(secondCwd, 'keep.txt'), { force: true });
				removedContents = true;
				break;
			} catch (error) {
				workspaceRemoveError = error instanceof Error ? error.message : String(error);
				await delay(300);
			}
		}
		let resumeAfterRemoval;
		try {
			const response = await harness.resumeThread({
				threadId: second.thread.id,
				excludeTurns: true,
			});
			resumeAfterRemoval = { ok: true, status: response.thread?.status ?? null };
		} catch (error) {
			resumeAfterRemoval = {
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
		measurement.workspaceRemoved = {
			warmupStatus: warmup.status,
			secondCwd,
			removedContents,
			removeError: workspaceRemoveError,
			resume: resumeAfterRemoval,
		};
		await rm(secondCwd, { recursive: true, force: true }).catch(() => undefined);
		measurement.healthAfter = harness.health();
		return { threadId: thread.thread.id };
	});

	const message = measurement.noRolloutError;
	checks.add(
		'resume without a rollout raised an error',
		message !== null,
		JSON.stringify(measurement.noRolloutError),
	);
	checks.add(
		'error names the missing rollout',
		typeof message === 'string' && /no rollout found|rollout/iu.test(message),
		`message=${message}`,
	);
	checks.add(
		'the supervisor stayed healthy after the error',
		measurement.healthAfter?.ok === true,
		JSON.stringify(measurement.healthAfter),
	);
	checks.add(
		'a turn works after the failed resume',
		measurement.postErrorTurn?.status === 'completed',
		`status=${measurement.postErrorTurn?.status}`,
	);
	checks.add(
		'resume after workspace removal was recorded',
		measurement.workspaceRemoved !== null,
		JSON.stringify(measurement.workspaceRemoved),
	);
	return {
		name: 'resume-no-rollout',
		status: checks.status(),
		checks: checks.checks,
		metrics: { ...measurement, shutdown: outcome.shutdown },
	};
}

// ---------------------------------------------------------------------------
// S5: 4 processes sharing one EASYCODE_HOME for >= 10 minutes
// ---------------------------------------------------------------------------
async function scenarioConcurrentHome(ctx) {
	const { processes, intervalMs, turnTimeoutMs } = ctx.profile.stress;
	const durationMs = Math.round(ctx.profile.stress.minutes * 60_000);
	const checks = makeChecks();
	const workRoot = await makeTempDir('poc-stress-');

	let home = ctx.args.home;
	let homeSeeded = null;
	if (home === null) {
		if (ctx.profile.kind === 'smoke') {
			home = await makeTempDir('poc-stress-home-');
		} else {
			const seeded = await seedIsolatedHome();
			home = seeded.home;
			homeSeeded = seeded.seeded;
		}
	}

	const workers = [];
	const events = [];
	ctx.home = home;
	for (let index = 0; index < processes; index += 1) {
		const cwd = path.join(workRoot, `proc-${index}`);
		const workerOutDir = path.join(ctx.outDir, `proc-${index}`);
		const recorder = new Recorder(workerOutDir);
		const worker = {
			index,
			cwd,
			outDir: workerOutDir,
			recorder,
			harness: null,
			threadId: null,
			started: false,
			threadStarted: false,
			initMs: null,
			initAttempts: [],
			initFailures: 0,
			initRetries: 0,
			initRecoveryMs: null,
			threadStartMs: null,
			threadStartAttempts: [],
			threadStartFailures: 0,
			initError: null,
			threadStartError: null,
			turnsAttempted: 0,
			turnsSucceeded: 0,
			turnsFailed: 0,
			retries: 0,
			busyRetries: 0,
			lastTurn: null,
			startedAtMs: null,
		};
		workers.push(worker);
	}
	const { mkdir } = await import('node:fs/promises');
	await Promise.all(workers.map((worker) => mkdir(worker.cwd, { recursive: true })));

	const harnessFor = (worker, mode) =>
		new Harness({
			...harnessOptions(ctx, mode),
			cwd: worker.cwd,
			outDir: worker.outDir,
			recorder: worker.recorder,
			approvalTimeoutMs: ctx.profile.approvalTimeoutMs,
			events: {
				onApprovalRequest: () => 'accept',
			},
		});

	// Start all processes together. Concurrent first use of the shared home
	// exercises database creation and migration locking. The real binary can
	// fail this race with "failed to initialize sqlite state runtime", so the
	// host restarts a crashed process with a per-process backoff and counts the
	// attempts. This matches the restart policy the desktop supervisor needs.
	const startWithRetry = async (worker) => {
		const mode = ctx.profile.kind === 'smoke' ? 'no-approval' : 'approval';
		const firstStartedAt = Date.now();
		for (let attempt = 1; attempt <= 3; attempt += 1) {
			worker.harness = harnessFor(worker, mode);
			const attemptStartedAt = Date.now();
			try {
				await worker.harness.start();
				worker.started = true;
				worker.startedAtMs = Date.now();
				worker.initMs = Date.now() - attemptStartedAt;
				worker.initAttempts.push({ attempt, ok: true, ms: worker.initMs, error: null });
				if (attempt > 1) worker.initRecoveryMs = Date.now() - firstStartedAt;
				return;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				worker.initError = message;
				worker.initFailures += 1;
				worker.initAttempts.push({
					attempt,
					ok: false,
					ms: Date.now() - attemptStartedAt,
					error: message,
				});
				events.push({ at: nowIso(), worker: worker.index, event: 'init-error', attempt, message });
				await worker.harness.shutdown().catch(() => undefined);
				if (attempt < 3) {
					worker.initRetries += 1;
					// Stagger the restarts so the retries do not collide again.
					await delay(1_500 * attempt + worker.index * 400);
				}
			}
		}
	};
	await Promise.all(workers.map(startWithRetry));

	const settle = async (ms) => await delay(ms);
	// Small stagger so the servers do not fight over the model connection setup.
	await settle(ctx.profile.kind === 'smoke' ? 50 : 500);
	await Promise.all(
		workers.map(async (worker) => {
			if (!worker.started) return;
			for (let attempt = 1; attempt <= 3; attempt += 1) {
				const startedAt = Date.now();
				try {
					const response = await worker.harness.startThread({
						cwd: worker.cwd,
						approvalPolicy: 'on-request',
						sandbox: 'workspace-write',
						ephemeral: false,
					});
					worker.threadId = response.thread.id;
					worker.threadStarted = true;
					worker.threadStartMs = Date.now() - startedAt;
					worker.threadStartAttempts.push({
						attempt,
						ok: true,
						ms: worker.threadStartMs,
						error: null,
					});
					return;
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					worker.threadStartError = message;
					worker.threadStartFailures += 1;
					worker.threadStartAttempts.push({
						attempt,
						ok: false,
						ms: Date.now() - startedAt,
						error: message,
					});
					events.push({
						at: nowIso(),
						worker: worker.index,
						event: 'thread-start-error',
						attempt,
						message,
					});
					if (attempt < 3) await delay(500 * attempt + worker.index * 200);
				}
			}
		}),
	);

	// Warmup turn per worker (retried on busy errors).
	if (workers.every((worker) => !worker.threadStarted)) {
		await Promise.all(
			workers.map(async (worker) => await worker.harness?.shutdown().catch(() => undefined)),
		);
		throw new Error(
			`no worker started: ${JSON.stringify(
				workers.map((worker) => ({
					index: worker.index,
					initError: worker.initError,
					threadStartError: worker.threadStartError,
				})),
			)}`,
		);
	}
	await Promise.all(
		workers.map(async (worker) => {
			if (!worker.threadStarted) return;
			const turn = await stressTurn(
				worker,
				'Warmup turn. Reply with the single word OK.',
				turnTimeoutMs,
			);
			events.push({ at: nowIso(), worker: worker.index, event: 'warmup', result: turn });
		}),
	);

	const samples = [];
	const sample = async (label) => {
		const [dbSizes, memories] = await Promise.all([
			readDirectorySizes(home),
			Promise.all(
				workers.map(async (worker) => ({
					index: worker.index,
					pid: worker.harness?.health().pid ?? null,
					...(await readProcessMemory(worker.harness?.health().pid ?? null)),
				})),
			),
		]);
		samples.push({
			atSec: Math.round((Date.now() - (ctx.stressStartedAtMs ?? Date.now())) / 1000),
			label,
			dbTotalBytes: dbSizes.totalBytes,
			dbFiles: dbSizes.files,
			memories,
			transport: workers.map((worker) => ({
				index: worker.index,
				stats: worker.harness?.health().transport ?? null,
			})),
		});
	};

	ctx.stressStartedAtMs = Date.now();
	// The load window starts now, after process/thread/warmup setup, so the
	// measured wall time covers the full configured duration.
	const deadline = ctx.stressStartedAtMs + durationMs;
	await sample('start');
	let slot = Date.now() + (ctx.profile.kind === 'smoke' ? 100 : 1_000);
	let turnIndex = 0;
	let nextSampleAt = Date.now() + 60_000;
	while (Date.now() < deadline) {
		const waitMs = slot - Date.now();
		if (waitMs > 0) await delay(Math.min(waitMs, deadline - Date.now()));
		if (Date.now() >= deadline) break;
		turnIndex += 1;
		const prompts =
			ctx.profile.kind === 'smoke'
				? [`Stress turn ${turnIndex}. Reply OK.`]
				: [`Stress turn ${turnIndex}. Reply with the single word OK.`];
		await Promise.all(
			workers.map(async (worker) => {
				if (!worker.threadStarted) return;
				const result = await stressTurn(worker, prompts[0], turnTimeoutMs);
				if (turnIndex <= 1 || result.status !== 'completed') {
					events.push({
						at: nowIso(),
						worker: worker.index,
						event: 'turn',
						turn: turnIndex,
						result,
					});
				}
			}),
		);
		slot += intervalMs;
		if (Date.now() >= nextSampleAt) {
			await sample('interval');
			nextSampleAt += 60_000;
		}
	}
	await sample('end');
	const wallMs = Date.now() - ctx.stressStartedAtMs;

	const shutdowns = await Promise.all(
		workers.map(async (worker) => {
			const startedAt = Date.now();
			try {
				const result = await worker.harness?.shutdown();
				return { index: worker.index, ms: Date.now() - startedAt, result };
			} catch (error) {
				return {
					index: worker.index,
					ms: Date.now() - startedAt,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}),
	);
	for (const worker of workers) worker.recorder.close();

	const dbSizesEnd = await readDirectorySizes(home);
	const workerSummary = workers.map((worker) => ({
		index: worker.index,
		started: worker.started,
		initMs: worker.initMs,
		initAttempts: worker.initAttempts,
		initFailures: worker.initFailures,
		initRetries: worker.initRetries,
		initRecoveryMs: worker.initRecoveryMs,
		initError: worker.started ? null : worker.initError,
		threadStarted: worker.threadStarted,
		threadStartMs: worker.threadStartMs,
		threadStartAttempts: worker.threadStartAttempts,
		threadStartFailures: worker.threadStartFailures,
		threadStartError: worker.threadStarted ? null : worker.threadStartError,
		turnsAttempted: worker.turnsAttempted,
		turnsSucceeded: worker.turnsSucceeded,
		turnsFailed: worker.turnsFailed,
		retries: worker.retries,
		busyRetries: worker.busyRetries,
		busyStderrLines: worker.recorder.busyStderrLines.length,
		busyStderrSample: worker.recorder.busyStderrLines.slice(0, 5),
	}));
	const totals = workerSummary.reduce(
		(accumulator, worker) => ({
			turnsAttempted: accumulator.turnsAttempted + worker.turnsAttempted,
			turnsSucceeded: accumulator.turnsSucceeded + worker.turnsSucceeded,
			turnsFailed: accumulator.turnsFailed + worker.turnsFailed,
			retries: accumulator.retries + worker.retries,
			busyStderrLines: accumulator.busyStderrLines + worker.busyStderrLines,
			initFailures: accumulator.initFailures + worker.initFailures,
			initRetries: accumulator.initRetries + worker.initRetries,
			threadStartFailures: accumulator.threadStartFailures + worker.threadStartFailures,
		}),
		{
			turnsAttempted: 0,
			turnsSucceeded: 0,
			turnsFailed: 0,
			retries: 0,
			busyStderrLines: 0,
			initFailures: 0,
			initRetries: 0,
			threadStartFailures: 0,
		},
	);

	checks.add(
		'all processes started (after restart retries)',
		workers.every((worker) => worker.started),
		JSON.stringify(
			workerSummary.map((worker) => ({
				index: worker.index,
				started: worker.started,
				initAttempts: worker.initAttempts.length,
				initError: worker.initError,
			})),
		),
	);
	checks.add(
		'all threads started (after retries)',
		workers.every((worker) => worker.threadStarted),
		JSON.stringify(
			workerSummary.map((worker) => ({
				index: worker.index,
				threadStarted: worker.threadStarted,
				threadStartFailures: worker.threadStartFailures,
				error: worker.threadStartError,
			})),
		),
	);
	checks.add(
		'cold-start failures were retried, not ignored',
		totals.initFailures === 0 || totals.initRetries > 0,
		`initFailures=${totals.initFailures} initRetries=${totals.initRetries}`,
	);
	checks.add(
		'the stress window reached the configured duration',
		wallMs >= durationMs - 1_000,
		`wallMs=${wallMs} required=${durationMs}`,
	);
	checks.add(
		'at least one turn ran per started process',
		workers.every((worker) => !worker.started || worker.turnsAttempted > 0),
		JSON.stringify(workerSummary),
	);
	checks.add(
		'no unrecovered turn failures',
		workers.every((worker) => worker.turnsFailed === 0),
		JSON.stringify(workerSummary),
	);
	checks.add(
		'the shared home is isolated from the real easycode home',
		home !== REAL_EASYCODE_HOME,
		`home=${home}`,
	);
	if (ctx.profile.kind === 'real') {
		const files = Object.keys(dbSizesEnd.files);
		checks.add(
			'the shared home has a SQLite database with a WAL file',
			files.some((name) => /\.sqlite$/u.test(name)) && files.some((name) => /-wal$/u.test(name)),
			JSON.stringify(files),
		);
		checks.add(
			'thread history database grew',
			(dbSizesEnd.files['thread_history_1.sqlite'] ?? 0) > 0,
			JSON.stringify(dbSizesEnd.files),
		);
	}

	const metrics = {
		home,
		homeSeeded,
		workRoot,
		durationMs,
		wallMs,
		processes,
		intervalMs,
		turnSlots: turnIndex,
		totals,
		workers: workerSummary,
		samples,
		dbSizesEnd,
		events: events.slice(-400),
		shutdowns,
	};
	if (!ctx.args.keepHome && ctx.args.home === null) {
		await rm(home, { recursive: true, force: true }).catch(() => undefined);
	}
	return {
		name: 'concurrent-home',
		status: checks.status(),
		checks: checks.checks,
		metrics,
	};
}

/**
 * One stress turn with bounded retries. A retry is counted when the first
 * attempt did not complete. Busy-looking errors are counted separately.
 */
async function stressTurn(worker, prompt, timeoutMs) {
	worker.turnsAttempted += 1;
	let lastResult = null;
	for (let attempt = 0; attempt <= 3; attempt += 1) {
		if (attempt > 0) {
			worker.retries += 1;
			await delay(Math.min(500 * 2 ** (attempt - 1), 3_000));
		}
		const startedAt = Date.now();
		let result;
		try {
			const turn = await worker.harness.runTurn(prompt, {
				threadId: worker.threadId,
				sandboxPolicy: READ_ONLY_SANDBOX,
				timeoutMs,
			});
			result = {
				attempt,
				status: turn.status,
				wallMs: Date.now() - startedAt,
				timeoutError: turn.timeoutError,
				turnError: turn.error,
				usage: turn.usage?.turnTotalDelta ?? null,
			};
		} catch (error) {
			result = {
				attempt,
				status: 'error',
				wallMs: Date.now() - startedAt,
				fatal: error instanceof Error ? error.message : String(error),
			};
		}
		lastResult = result;
		const failureText = `${result.status} ${result.timeoutError ?? ''} ${JSON.stringify(result.turnError ?? '')} ${result.fatal ?? ''}`;
		if (result.status === 'completed') {
			worker.turnsSucceeded += 1;
			worker.lastTurn = result;
			return result;
		}
		if (looksLikeBusyText(failureText)) worker.busyRetries += 1;
	}
	worker.turnsFailed += 1;
	worker.lastTurn = lastResult;
	return lastResult;
}

function looksLikeBusyText(text) {
	return /database is locked|database table is locked|SQLITE_BUSY|busy|EBUSY|lock/iu.test(text);
}

main().catch((error) => {
	console.error('[fault] fatal:', error);
	process.exitCode = 1;
});
