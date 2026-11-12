#!/usr/bin/env node
// M0-5 A/B baseline: free-text handoff (arm A) vs structured artifact reference
// plus conclusion (arm B) for the same two-stage task.
//
// Design:
//   Stage 1 (producer, identical in both arms): read 10 fixture files, write
//   findings.json, reply with a short free-text handoff (<= 120 words).
//   Stage 2 (consumer): write answer.json. The only difference between the arms
//   is the handoff description:
//     A  the producer's free-text reply is pasted into the consumer prompt.
//     B  the consumer gets {artifactPath, sha256, conclusion} and must read the
//        producer's artifact.
//   Verification compares answer.json with the fixture-derived ground truth.
//   A failed first attempt gets at most one repair turn (rework count).
//
// Metrics per run: stage token usage from thread/tokenUsage/updated, wall time,
// first-pass success, final success, rework turns, handoff size.
//
// Usage:
//   node scripts/poc/ab-baseline.mjs --runs 3
//   node scripts/poc/ab-baseline.mjs --smoke     # fake server, wiring only
//
// A real run needs Node 24, easycode.exe, and model credentials. The binary
// version is checked before the first run. `--smoke` writes no conclusions: it
// proves the harness wiring in CI with fake-app-server.mjs.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
	ARTIFACTS_DIR,
	DEFAULT_EXE,
	FAKE_SERVER_PATH,
	Harness,
	Recorder,
	makeTempDir,
	nowIso,
	parseArgs,
	probeVersion,
	runId,
	seedIsolatedHome,
	writeJsonFile,
} from './poc-lib.mjs';

// The real binary validates workspaceWrite.networkAccess as a boolean. The
// runtime package's TypeScript type declares 'restricted' | 'enabled', which the
// server rejects ("invalid type: string ..., expected a boolean"); this script
// passes the shape the server accepts.
const WORKSPACE_WRITE_SANDBOX = (root) => ({
	type: 'workspaceWrite',
	writableRoots: [root],
	networkAccess: false,
	excludeTmpdirEnvVar: false,
	excludeSlashTmp: true,
});

// Deterministic fixture. The verifier derives the expected values from these
// files, so the data and the check can never drift apart.
const FIXTURE_FILES = [
	{ name: 'alpha', token: '7f3a91c2', commentLines: 2 },
	{ name: 'beta', token: '1b8d44e0', commentLines: 1 },
	{ name: 'gamma', token: 'c4e2a90f', commentLines: 3 },
	{ name: 'delta', token: '9d5b07aa', commentLines: 0 },
	{ name: 'epsilon', token: 'e17c6b3d', commentLines: 2 },
	{ name: 'zeta', token: '04fa8e11', commentLines: 1 },
	{ name: 'eta', token: 'b6d29c47', commentLines: 0 },
	{ name: 'theta', token: '52e8f7a0', commentLines: 3 },
	{ name: 'iota', token: 'ad3910ce', commentLines: 1 },
	{ name: 'kappa', token: '6c0b5d92', commentLines: 2 },
];

const DEFAULT_ARGS = {
	arm: 'both',
	runs: 3,
	smoke: false,
	exe: process.env.EASYCODE_EXE ?? DEFAULT_EXE,
	outDir: null,
	turnTimeout: 300,
	repairAttempts: 1,
	help: false,
};

function printHelp() {
	console.log(`M0-5 A/B baseline for the multi-agent handoff protocol.

  --arm <both|a|b>       Arms to run. Default: both
  --runs <n>             Runs per arm. Default: 3
  --smoke                Fake server, 1 run per arm, wiring only
  --exe <path>           easycode.exe (default: EASYCODE_EXE or M0 path)
  --out-dir <path>       Artifact dir (default: scripts/poc/.artifacts/ab-<id>)
  --turn-timeout <s>     Per-turn timeout. Default: 300       (${'seconds'})
  --repair-attempts <n>  Repair turns after a failed answer. Default: 1`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2), DEFAULT_ARGS);
	if (args.help) {
		printHelp();
		process.exit(0);
	}
	if (!['both', 'a', 'b'].includes(args.arm)) throw new Error(`invalid --arm: ${args.arm}`);
	const id = runId();
	const outDir = path.resolve(
		args.outDir ?? path.join(ARTIFACTS_DIR, `${args.smoke ? 'ab-smoke' : 'ab'}-${id}`),
	);
	const runs = args.smoke ? 1 : args.runs;
	const arms = args.arm === 'both' ? ['a', 'b'] : [args.arm];
	const summary = {
		meta: {
			startedAt: nowIso(),
			runId: id,
			node: process.version,
			platform: `${process.platform}-${process.arch}`,
			kind: args.smoke ? 'smoke' : 'real',
			exe: args.smoke ? `${process.execPath} ${FAKE_SERVER_PATH}` : args.exe,
			version: null,
			script: 'ab-baseline.mjs',
			args,
			outDir,
			runsPerArm: runs,
			arms,
			fixture: FIXTURE_FILES,
		},
		runs: [],
		aggregate: {},
	};
	await writeJsonFile(path.join(outDir, 'meta.json'), summary.meta);

	let home = null;
	let homeSeed = null;
	if (args.smoke) {
		home = await makeTempDir('poc-ab-home-');
	} else {
		summary.meta.version = await probeVersion(args.exe);
		console.log(`[ab] easycode: ${summary.meta.version}`);
		if (summary.meta.version === 'unavailable')
			throw new Error(`easycode binary is not runnable: ${args.exe}`);
		const seeded = await seedIsolatedHome();
		home = seeded.home;
		homeSeed = seeded.seeded;
		summary.meta.home = home;
		summary.meta.homeSeed = seeded.seeded;
		console.log(`[ab] isolated EASYCODE_HOME: ${home}`);
	}
	const groundTruth = await buildFixture(await makeTempDir('poc-ab-fixture-'));
	console.log(
		`[ab] fixture ground truth: ${Object.keys(groundTruth.files).length} files, ${groundTruth.totalCommentLines} comment lines`,
	);

	const baseEnv = args.smoke
		? {
				...process.env,
				FAKE_MODE: 'no-approval',
				FAKE_USAGE: '1',
				FAKE_ANSWER_JSON: JSON.stringify(groundTruth),
				FAKE_FINDINGS_JSON: JSON.stringify(groundTruth),
			}
		: { ...process.env, EASYCODE_HOME: home };

	for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
		for (const arm of arms) {
			const runStartedAt = Date.now();
			const runOutDir = path.join(outDir, `run-${runIndex}-${arm}`);
			const label = `run ${runIndex}/${runs} arm ${arm.toUpperCase()}`;
			process.stdout.write(`[ab] ${label} ... `);
			let run;
			try {
				run = await runOnce({
					arm,
					runIndex,
					runOutDir,
					groundTruth,
					baseEnv,
					args,
				});
			} catch (error) {
				run = {
					arm,
					runIndex,
					status: 'error',
					error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
					stack: error instanceof Error ? error.stack : null,
				};
			}
			run.wallMs = Date.now() - runStartedAt;
			summary.runs.push(run);
			await writeJsonFile(path.join(outDir, `run-${runIndex}-${arm}.json`), run);
			const usage = run.totals?.tokens ?? null;
			console.log(
				`${run.status} firstPass=${run.consumer?.firstPassSuccess ?? 'n/a'} rework=${run.consumer?.reworkCount ?? 'n/a'} tokens=${usage ?? 'n/a'} wall=${run.wallMs} ms`,
			);
		}
	}

	summary.aggregate = {
		a: aggregateArm(summary.runs.filter((run) => run.arm === 'a')),
		b: aggregateArm(summary.runs.filter((run) => run.arm === 'b')),
	};
	summary.meta.finishedAt = nowIso();
	summary.meta.durationMs =
		Date.parse(summary.meta.finishedAt) - Date.parse(summary.meta.startedAt);
	await writeJsonFile(path.join(outDir, 'summary.json'), summary);

	printReport(summary);
	if (summary.runs.some((run) => run.status === 'error')) process.exitCode = 1;
}

/** Create the fixture workspace and derive the ground truth from the bytes. */
async function buildFixture(root) {
	const srcDir = path.join(root, 'src');
	await mkdir(srcDir, { recursive: true });
	for (const file of FIXTURE_FILES) {
		const lines = [];
		lines.push(`# ${file.name} section ${file.commentLines}`);
		for (let index = 0; index < file.commentLines; index += 1)
			lines.push(`# note ${file.name} ${index + 1}`);
		lines.push(`TOKEN: ${file.token}`);
		lines.push(`${file.name} body line one`);
		lines.push(`${file.name} body line two`);
		await writeFile(path.join(srcDir, `${file.name}.txt`), `${lines.join('\n')}\n`, 'utf8');
	}
	return await computeGroundTruth(srcDir);
}

async function computeGroundTruth(srcDir) {
	const { readdir } = await import('node:fs/promises');
	const names = (await readdir(srcDir)).filter((name) => name.endsWith('.txt')).sort();
	const files = {};
	let totalCommentLines = 0;
	for (const name of names) {
		const text = await readFile(path.join(srcDir, name), 'utf8');
		const lines = text.split(/\r?\n/u);
		const tokenMatch = /^TOKEN:\s*(\S+)\s*$/mu.exec(text);
		const commentLines = lines.filter((line) => line.startsWith('#')).length;
		files[name.replace(/\.txt$/u, '')] = { token: tokenMatch?.[1] ?? null, commentLines };
		totalCommentLines += commentLines;
	}
	return { files, totalCommentLines };
}

/** Windows may hold a short-lived handle; retry the removal. */
async function rmWithRetry(target) {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		try {
			await rm(target, { recursive: true, force: true });
			return true;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 300));
		}
	}
	return false;
}

const ANSWER_SHAPE = [
	'Write answer.json in the current directory with exactly this shape:',
	'{"files":{"<file base name>":{"token":"<8 characters>","commentLines":<number>}},"totalCommentLines":<number>}',
	'Use every file in src/ as a key (without the .txt suffix), write valid JSON only, and do not add extra keys.',
].join('\n');

const PRODUCER_PROMPT = [
	'You are the analysis agent in a two-agent pipeline. Work only in the current directory.',
	'Read every *.txt file in src/.',
	'For each file record: (1) the exact 8-character value on the line that starts with "TOKEN:", (2) the number of lines whose first character is "#".',
	'Write findings.json in the current directory with exactly this shape:',
	'{"files":{"<file base name>":{"token":"<8 characters>","commentLines":<number>}},"totalCommentLines":<number>}',
	'Use every file in src/ as a key (without the .txt suffix) and write valid JSON only.',
	'Then reply with a short handoff for the next agent. The handoff must be plain prose and must not be longer than 120 words.',
].join('\n');

function consumerPromptA(handoffText) {
	return [
		'You are the implementation agent in a two-agent pipeline.',
		'The analysis agent finished. Its entire handoff is this free-text message:',
		'--- HANDOFF START ---',
		handoffText.length === 0 ? '(empty handoff)' : handoffText,
		'--- HANDOFF END ---',
		"You cannot read the analysis agent's files. Use only this handoff as your source of truth.",
		ANSWER_SHAPE,
	].join('\n');
}

function consumerPromptB(handoff) {
	return [
		'You are the implementation agent in a two-agent pipeline.',
		'The analysis agent finished and produced this structured handoff:',
		JSON.stringify(
			{
				artifactPath: handoff.artifactPath,
				conclusion: handoff.conclusion,
				sha256: handoff.sha256,
			},
			null,
			2,
		),
		'Read the artifact file at artifactPath. It is the source of truth.',
		ANSWER_SHAPE,
	].join('\n');
}

function repairPrompt(arm, handoff, verificationError) {
	const header = `Your previous answer.json failed verification: ${verificationError}`;
	if (arm === 'a') {
		return [
			header,
			'Here is the same free-text handoff again:',
			'--- HANDOFF START ---',
			handoff.text,
			'--- HANDOFF END ---',
			'Rewrite answer.json with the exact correct values.',
		].join('\n');
	}
	return [
		header,
		'The structured handoff is unchanged:',
		JSON.stringify(
			{
				artifactPath: handoff.artifactPath,
				conclusion: handoff.conclusion,
				sha256: handoff.sha256,
			},
			null,
			2,
		),
		'Re-read the artifact and rewrite answer.json with the exact correct values.',
	].join('\n');
}

async function runOnce({ arm, runIndex, runOutDir, groundTruth, baseEnv, args }) {
	const runRoot = await makeTempDir(`poc-ab-run-${arm}-`);
	const producerWs = path.join(runRoot, 'producer-ws');
	const consumerWs = path.join(runRoot, 'consumer-ws');
	await buildFixture(producerWs);
	await mkdir(consumerWs, { recursive: true });
	const srcDir = path.join(producerWs, 'src');

	const recorder = new Recorder(runOutDir);
	const harnessOptions = args.smoke
		? { exePath: process.execPath, appServerArgs: [FAKE_SERVER_PATH], env: baseEnv }
		: { exePath: args.exe, env: baseEnv };
	const harness = new Harness({
		...harnessOptions,
		cwd: producerWs,
		outDir: runOutDir,
		recorder,
		approvalTimeoutMs: 120_000,
		events: { onApprovalRequest: () => 'accept' },
	});

	const result = {
		arm,
		runIndex,
		status: 'completed',
		workspace: { producerWs, consumerWs, srcDir },
		producer: null,
		handoff: null,
		consumer: null,
		totals: {
			tokens: 0,
			producerTokens: 0,
			consumerTokens: 0,
			outputTokens: 0,
			turns: 0,
			approvalRequests: 0,
		},
	};
	try {
		result.initialize = await harness.start();
		const producerThread = await harness.startThread({
			cwd: producerWs,
			approvalPolicy: 'on-request',
			sandbox: 'workspace-write',
			ephemeral: false,
		});
		const producerTurn = await harness.runTurn(PRODUCER_PROMPT, {
			threadId: producerThread.thread.id,
			sandboxPolicy: WORKSPACE_WRITE_SANDBOX(producerWs),
			timeoutMs: args.turnTimeout * 1_000,
		});
		const artifactPath = path.join(producerWs, 'findings.json');
		const artifactText = await readTextRobust(artifactPath);
		const artifact = parseJsonOrNull(artifactText);
		const artifactMatches = artifact !== null && deepEqual(artifact, groundTruth);
		result.producer = {
			threadId: producerThread.thread.id,
			turn: turnSummary(producerTurn),
			artifactPath,
			artifactPresent: artifactText !== null,
			artifactMatches,
			artifactPreview: artifactText === null ? null : artifactText.slice(0, 400),
		};

		const handoffText = producerTurn.agentText ?? '';
		const artifactSummary =
			artifact !== null && typeof artifact.files === 'object' && artifact.files !== null
				? {
						fileCount: Object.keys(artifact.files).length,
						totalCommentLines: artifact.totalCommentLines ?? null,
					}
				: { fileCount: null, totalCommentLines: null };
		const structured = {
			artifactPath: path.join(consumerWs, 'artifacts', 'findings.json'),
			sha256: createHash('sha256')
				.update(artifactText ?? '')
				.digest('hex'),
			conclusion: {
				status: artifactMatches ? 'complete' : 'invalid-artifact',
				...artifactSummary,
			},
		};
		if (arm === 'b' && artifactText !== null) {
			await mkdir(path.dirname(structured.artifactPath), { recursive: true });
			await copyFile(artifactPath, structured.artifactPath);
		}
		// The consumer must not recover the producer's workspace. This makes arm A
		// test the free-text handoff itself instead of a shared-filesystem shortcut.
		await rmWithRetry(artifactPath);
		await rmWithRetry(path.join(producerWs, 'src'));
		const handoff =
			arm === 'a'
				? { kind: 'free-text', text: handoffText, chars: handoffText.length }
				: {
						kind: 'structured-artifact',
						artifactPath: structured.artifactPath,
						sha256: structured.sha256,
						conclusion: structured.conclusion,
						chars: JSON.stringify({
							artifactPath: structured.artifactPath,
							conclusion: structured.conclusion,
						}).length,
					};
		result.handoff = handoff;
		result.producer.workspaceCleared = true;

		const consumerThread = await harness.startThread({
			cwd: consumerWs,
			approvalPolicy: 'on-request',
			sandbox: 'workspace-write',
			ephemeral: false,
		});
		const consumerCwd = consumerWs;
		const firstPrompt = arm === 'a' ? consumerPromptA(handoff.text) : consumerPromptB(handoff);
		const firstTurn = await harness.runTurn(firstPrompt, {
			threadId: consumerThread.thread.id,
			sandboxPolicy: WORKSPACE_WRITE_SANDBOX(consumerWs),
			timeoutMs: args.turnTimeout * 1_000,
		});
		const firstVerification = await verifyAnswer(consumerCwd, groundTruth);
		const rework = [];
		let verification = firstVerification;
		while (!verification.ok && rework.length < args.repairAttempts) {
			const repair = repairPrompt(arm, handoff, verification.error);
			const repairTurn = await harness.runTurn(repair, {
				threadId: consumerThread.thread.id,
				sandboxPolicy: WORKSPACE_WRITE_SANDBOX(consumerWs),
				timeoutMs: args.turnTimeout * 1_000,
			});
			const repairVerification = await verifyAnswer(consumerCwd, groundTruth);
			rework.push({
				turn: turnSummary(repairTurn),
				verification: repairVerification,
			});
			verification = repairVerification;
		}
		result.consumer = {
			threadId: consumerThread.thread.id,
			consumerCwd,
			firstAttempt: turnSummary(firstTurn),
			firstAttemptCommands: commandLines(firstTurn),
			firstVerification,
			firstPassSuccess: firstVerification.ok,
			rework,
			reworkCount: rework.length,
			finalVerification: verification,
			finalSuccess: verification.ok,
			// Arm A must use only the free-text handoff. Commands that touch the
			// producer workspace or src/ mean the arm tried the shared-filesystem
			// shortcut; keep it visible.
			handoffOnlyViolation:
				arm === 'a' &&
				commandLines(firstTurn).some((command) => /producer-ws|\bsrc\b/u.test(command)),
			answerPreview: await readTextRobust(path.join(consumerCwd, 'answer.json')),
		};

		const turns = [producerTurn, firstTurn, ...rework.map((entry) => entry.turn)];
		const turnTokens = turns.map((turn) => turn.usage?.turnTotalDelta?.totalTokens ?? 0);
		result.totals = {
			tokens: turnTokens.reduce((total, value) => total + value, 0),
			producerTokens: producerTurn.usage?.turnTotalDelta?.totalTokens ?? 0,
			consumerTokens: turnTokens.slice(1).reduce((total, value) => total + value, 0),
			outputTokens: turns.reduce(
				(total, turn) => total + (turn.usage?.turnTotalDelta?.outputTokens ?? 0),
				0,
			),
			usageAvailable: turns.every((turn) => turn.usage?.available === true),
			turns: turns.length,
			approvalRequests: recorder.approvalRequests.length,
			producerWallMs: producerTurn.wallMs,
			consumerWallMs: firstTurn.wallMs,
			reworkWallMs: rework.reduce((total, entry) => total + (entry.turn.wallMs ?? 0), 0),
		};
	} catch (error) {
		result.status = 'error';
		result.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
		result.stack = error instanceof Error ? error.stack : null;
	} finally {
		try {
			result.shutdown = await harness.shutdown();
		} catch (error) {
			result.shutdown = { error: error instanceof Error ? error.message : String(error) };
		}
		recorder.close();
	}
	result.finishedAt = nowIso();
	return result;
}

function parseJsonOrNull(text) {
	if (text === null) return null;
	try {
		const value = JSON.parse(text);
		return typeof value === 'object' && value !== null ? value : null;
	} catch {
		return null;
	}
}

/**
 * Read a text file produced by the agent. Windows PowerShell 5.1 redirection
 * writes UTF-16LE (usually with a BOM), so a UTF-8 read would inject NUL bytes.
 */
async function readTextRobust(filePath) {
	const buffer = await readFile(filePath).catch(() => null);
	if (buffer === null) return null;
	if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe)
		return buffer.subarray(2).toString('utf16le');
	if (buffer.includes(0)) return buffer.toString('utf16le');
	return buffer.toString('utf8').replace(/^\uFEFF/u, '');
}

function deepEqual(left, right) {
	const leftText = JSON.stringify(normalize(left));
	const rightText = JSON.stringify(normalize(right));
	return leftText === rightText;
}

function normalize(value) {
	if (Array.isArray(value)) return value.map(normalize);
	if (value !== null && typeof value === 'object') {
		const output = {};
		for (const key of Object.keys(value).sort()) output[key] = normalize(value[key]);
		return output;
	}
	return value;
}

async function verifyAnswer(consumerCwd, groundTruth) {
	const answerPath = path.join(consumerCwd, 'answer.json');
	const text = await readTextRobust(answerPath);
	if (text === null) return { ok: false, error: 'answer.json is missing' };
	let answer;
	try {
		answer = JSON.parse(text);
	} catch (error) {
		return { ok: false, error: `answer.json is not valid JSON: ${error.message}` };
	}
	if (answer === null || typeof answer !== 'object')
		return { ok: false, error: 'answer.json is not an object' };
	const expectedFiles = Object.keys(groundTruth.files).sort();
	const actualFiles =
		answer.files !== null && typeof answer.files === 'object'
			? Object.keys(answer.files).sort()
			: [];
	if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
		return {
			ok: false,
			error: `file keys differ: expected ${expectedFiles.join(',')} got ${actualFiles.join(',')}`,
		};
	}
	for (const name of expectedFiles) {
		const expected = groundTruth.files[name];
		const actual = answer.files[name] ?? {};
		if (actual.token !== expected.token)
			return {
				ok: false,
				error: `token for ${name} is ${JSON.stringify(actual.token)}, expected ${expected.token}`,
			};
		if (actual.commentLines !== expected.commentLines) {
			return {
				ok: false,
				error: `commentLines for ${name} is ${JSON.stringify(actual.commentLines)}, expected ${expected.commentLines}`,
			};
		}
	}
	if (answer.totalCommentLines !== groundTruth.totalCommentLines) {
		return {
			ok: false,
			error: `totalCommentLines is ${JSON.stringify(answer.totalCommentLines)}, expected ${groundTruth.totalCommentLines}`,
		};
	}
	return { ok: true, error: null };
}

function turnSummary(turn) {
	return {
		turnId: turn.turnId,
		status: turn.status,
		durationMs: turn.durationMs,
		wallMs: turn.wallMs,
		timeoutError: turn.timeoutError,
		error: turn.error,
		agentText: turn.agentText,
		agentChars: (turn.agentText ?? '').length,
		usage: turn.usage,
	};
}

function commandLines(turn) {
	return (turn.items ?? [])
		.filter((item) => item.type === 'commandExecution' && typeof item.command === 'string')
		.map((item) => item.command);
}

function aggregateArm(runs) {
	const completed = runs.filter((run) => run.status === 'completed' && run.consumer !== undefined);
	const count = completed.length;
	const sum = (selector) => completed.reduce((total, run) => total + (selector(run) ?? 0), 0);
	const mean = (selector) => (count === 0 ? null : Math.round(sum(selector) / count));
	const median = (selector) => {
		const values = completed
			.map(selector)
			.filter((value) => typeof value === 'number')
			.sort((a, b) => a - b);
		if (values.length === 0) return null;
		const middle = Math.floor(values.length / 2);
		return values.length % 2 === 0
			? Math.round((values[middle - 1] + values[middle]) / 2)
			: values[middle];
	};
	return {
		runs: count,
		errors: runs.length - count,
		firstPassSuccesses: completed.filter((run) => run.consumer.firstPassSuccess).length,
		firstPassSuccessRate:
			count === 0
				? null
				: roundRatio(completed.filter((run) => run.consumer.firstPassSuccess).length / count),
		finalSuccesses: completed.filter((run) => run.consumer.finalSuccess).length,
		finalSuccessRate:
			count === 0
				? null
				: roundRatio(completed.filter((run) => run.consumer.finalSuccess).length / count),
		totalRework: sum((run) => run.consumer.reworkCount),
		reworkRuns: completed.filter((run) => run.consumer.reworkCount > 0).length,
		producerArtifactValidRate:
			count === 0
				? null
				: roundRatio(completed.filter((run) => run.producer.artifactMatches).length / count),
		usageAvailable:
			count === 0 ? false : completed.every((run) => run.totals.usageAvailable === true),
		tokens: {
			producerMean: mean((run) => run.totals.producerTokens),
			consumerMean: mean((run) => run.totals.consumerTokens),
			totalMean: mean((run) => run.totals.tokens),
			totalMedian: median((run) => run.totals.tokens),
			outputMean: mean((run) => run.totals.outputTokens),
		},
		latencyMs: {
			producerMean: mean((run) => run.totals.producerWallMs),
			consumerMean: mean((run) => run.totals.consumerWallMs),
			consumerMedian: median((run) => run.totals.consumerWallMs),
			reworkMean: mean((run) => run.totals.reworkWallMs),
			turnsMean: mean((run) => run.totals.turns),
		},
		handoffCharsMean: mean((run) => run.handoff.chars),
		handoffOnlyViolations: completed.filter((run) => run.consumer.handoffOnlyViolation).length,
		approvalRequests: sum((run) => run.totals.approvalRequests),
	};
}

function roundRatio(value) {
	return Math.round(value * 1000) / 1000;
}

function printReport(summary) {
	const { a, b } = summary.aggregate;
	console.log('\n=== A/B handoff baseline ===');
	const rows = [
		['mode', summary.meta.kind],
		['runs per arm', summary.meta.runsPerArm],
		['A first-pass success', `${a.firstPassSuccesses}/${a.runs}`],
		['B first-pass success', `${b.firstPassSuccesses}/${b.runs}`],
		['A final success', `${a.finalSuccesses}/${a.runs}`],
		['B final success', `${b.finalSuccesses}/${b.runs}`],
		['A rework turns', a.totalRework],
		['B rework turns', b.totalRework],
		['A consumer tokens (mean)', a.tokens.consumerMean],
		['B consumer tokens (mean)', b.tokens.consumerMean],
		['A total tokens (mean)', a.tokens.totalMean],
		['B total tokens (mean)', b.tokens.totalMean],
		['A consumer latency ms (mean)', a.latencyMs.consumerMean],
		['B consumer latency ms (mean)', b.latencyMs.consumerMean],
		['A handoff chars (mean)', a.handoffCharsMean],
		['B handoff chars (mean)', b.handoffCharsMean],
		['A handoff-only violations', a.handoffOnlyViolations],
		['usage available', `${a.usageAvailable}/${b.usageAvailable}`],
	];
	for (const [label, value] of rows) console.log(`${String(label).padEnd(30)} ${value}`);
	console.log(`\nArtifacts: ${summary.meta.outDir ?? ''}`);
}

main().catch((error) => {
	console.error('[ab] fatal:', error);
	process.exitCode = 1;
});
