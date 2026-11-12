#!/usr/bin/env node
// M1 A/B retest: isolated agents, fixed producer artifact, >=3 runs per arm,
// two payload sizes (1 file vs 10 files / beyond a 600-character prose handoff).
//
// Experiment:
//   1. Producer (one real run per payload) turns repo/ + changes.json into a
//      fixed change-artifact.json (manifest + diff) and one prose handoff
//      (<= 600 chars). The artifact is validated against the fixture; when the
//      model output is invalid after retries, the canonical artifact is used and
//      marked host-fallback.
//   2. Consumers run repeatedly (A,B,A,B,...) in an isolated workspace root and
//      their own per-agent EASYCODE_HOME. Arm A receives only the frozen prose;
//      arm B receives {artifact_ref, conclusion_proposed} and reads a copy of the
//      fixed artifact. Both write the final file bytes to out/.
//   3. A run passes when every out/<file> equals the expected final bytes.
//      A failed first attempt gets <= 1 repair turn (rework count).
//
// Isolation: the producer workspace is deleted before consumers run; consumers
// get a fresh temp root that is not a sibling of any producer path, a separate
// per-agent easyCode home, and a workspaceWrite sandbox. Absolute-path reads
// outside the workspace are not blocked by easyCode (recorded limitation), so
// consumer commands are scanned for `..` / producer-path mentions.
//
// Usage:
//   node scripts/poc/m1-ab-baseline.mjs --smoke                 # CI, fake server
//   M1AB_REAL=1 node scripts/poc/m1-ab-baseline.mjs --runs 3   # real model
//   node scripts/poc/m1-ab-baseline.mjs --real --runs 3 --payload both
//
// Flags: --payload small|large|both | --runs <n> | --repair-attempts <n> |
//        --out-dir <path> | --exe <path> | --prepare-only | --real | --smoke

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

const WORKSPACE_WRITE_SANDBOX = (root) => ({
	type: 'workspaceWrite',
	writableRoots: [root],
	networkAccess: false,
	excludeTmpdirEnvVar: false,
	excludeSlashTmp: true,
});

const PAYLOAD_FILES = { small: 1, large: 10 };
const PROSE_LIMIT = 600;
const FIXTURE_SEED = 'pong-m1-ab-v1';

const DEFAULT_ARGS = {
	payload: 'both',
	runs: 3,
	repairAttempts: 1,
	outDir: null,
	exe: process.env.EASYCODE_EXE ?? DEFAULT_EXE,
	real: false,
	smoke: false,
	prepareOnly: false,
	forcePrepare: false,
	help: false,
};

function printHelp() {
	console.log(`M1 A/B retest (isolated, fixed artifact, >=3 runs/arm).

  --payload <small|large|both>  small=1 file, large=10 files. Default: both
  --runs <n>                    Runs per arm per payload. Default: 3
  --repair-attempts <n>         Repair turns after a failed first answer. Default: 1
  --out-dir <path>              Artifact dir (default: scripts/poc/.artifacts/m1ab-<id>)
  --exe <path>                  easycode.exe (real mode)
  --real                        Use the real binary + model (or set M1AB_REAL=1)
  --smoke                       Use fake-app-server.mjs (default; no model)
  --prepare-only                Only (re)build the fixed producer artifacts
  --force-prepare               Re-run the producer even when a valid fixed artifact exists`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2), DEFAULT_ARGS);
	if (args.help) {
		printHelp();
		process.exit(0);
	}
	if (!['small', 'large', 'both'].includes(args.payload))
		throw new Error(`invalid --payload: ${args.payload}`);
	const real = args.smoke ? false : args.real || process.env.M1AB_REAL === '1';
	if (!args.smoke && !real) {
		console.log(
			'[m1ab] no --real / M1AB_REAL=1: smoke mode with fake-app-server.mjs (wiring only)',
		);
	}
	const id = runId();
	const outDir = path.resolve(
		args.outDir ?? path.join(ARTIFACTS_DIR, `m1ab-${real ? 'real' : 'smoke'}-${id}`),
	);
	const fixedDir = path.join(outDir, 'fixed');
	const payloads = args.payload === 'both' ? ['small', 'large'] : [args.payload];
	const summary = {
		meta: {
			startedAt: nowIso(),
			runId: id,
			node: process.version,
			platform: `${process.platform}-${process.arch}`,
			kind: real ? 'real' : 'smoke',
			exe: real ? args.exe : `${process.execPath} ${FAKE_SERVER_PATH}`,
			version: null,
			outDir,
			payloads,
			runsPerArm: args.runs,
			proseLimit: PROSE_LIMIT,
			sequence: 'A,B,A,B,... per payload',
		},
		fixed: {},
		runs: [],
		aggregate: {},
	};
	await writeJsonFile(path.join(outDir, 'meta.json'), summary.meta);
	if (real) {
		summary.meta.version = await probeVersion(args.exe);
		console.log(`[m1ab] easycode: ${summary.meta.version}`);
		if (summary.meta.version === 'unavailable')
			throw new Error(`easycode binary is not runnable: ${args.exe}`);
	}

	// Per-run isolated EASYCODE_HOME is created inside the producer/consumer
	// runs. Sharing one base home across runs let a consumer find earlier
	// agents' rollout logs (session JSONL) and recover the change values from
	// them, which broke read isolation.

	// 1) Prepared (fixed) artifacts.
	for (const payload of payloads) {
		const prepared = await preparePayload({ payload, args, real, fixedDir });
		summary.fixed[payload] = prepared;
		console.log(
			`[m1ab] prepared ${payload}: artifact=${prepared.artifactSource} valid=${prepared.artifactValid} prose=${prepared.proseChars} chars`,
		);
	}
	if (args.prepareOnly) {
		await writeJsonFile(path.join(outDir, 'summary.json'), summary);
		return;
	}

	// 2) Consumer runs, alternating arms per run index.
	for (const payload of payloads) {
		const fixed = summary.fixed[payload];
		const sequence = [];
		for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
			sequence.push({ runIndex, arm: 'a' }, { runIndex, arm: 'b' });
		}
		for (const step of sequence) {
			const label = `${payload} run ${step.runIndex} arm ${step.arm.toUpperCase()}`;
			process.stdout.write(`[m1ab] ${label} ... `);
			let result;
			try {
				result = await runConsumer({
					payload,
					arm: step.arm,
					runIndex: step.runIndex,
					fixed,
					args,
					real,
					outDir: path.join(outDir, 'runs', `${payload}-${step.runIndex}-${step.arm}`),
				});
			} catch (error) {
				result = {
					payload,
					arm: step.arm,
					runIndex: step.runIndex,
					status: 'error',
					error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
					stack: error instanceof Error ? error.stack : null,
				};
			}
			summary.runs.push(result);
			await writeJsonFile(
				path.join(outDir, 'runs', `${payload}-${step.runIndex}-${step.arm}.json`),
				result,
			);
			console.log(
				`${result.status} firstPass=${result.firstPassSuccess ?? 'n/a'} rework=${result.reworkCount ?? 'n/a'} ` +
					`tokens=${result.tokens?.consumerTotal ?? 'n/a'} wall=${result.wallMs ?? 'n/a'}ms`,
			);
		}
	}

	summary.aggregate = aggregateAll(summary.runs);
	summary.meta.finishedAt = nowIso();
	summary.meta.durationMs =
		Date.parse(summary.meta.finishedAt) - Date.parse(summary.meta.startedAt);
	await writeJsonFile(path.join(outDir, 'summary.json'), summary);
	printReport(summary, payloads);
	if (summary.runs.some((run) => run.status === 'error')) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Fixture: deterministic repo + change spec + expected final bytes
// ---------------------------------------------------------------------------
function sha256Hex(text) {
	return createHash('sha256').update(text).digest('hex');
}

function makeFixture(payload) {
	const count = PAYLOAD_FILES[payload];
	const files = [];
	for (let index = 1; index <= count; index += 1) {
		const name = `f${String(index).padStart(2, '0')}.txt`;
		const id = sha256Hex(`${FIXTURE_SEED}:${name}:id`).slice(0, 8);
		const base1 = sha256Hex(`${FIXTURE_SEED}:${name}:b1`).slice(0, 8);
		const base2 = sha256Hex(`${FIXTURE_SEED}:${name}:b2`).slice(0, 8);
		const originalLines = [
			`FILE: ${name}`,
			`ID: ${id}`,
			'NOTE: m1-ab fixture file',
			`BASE1: ${base1}`,
			`BASE2: ${base2}`,
		];
		const appendLines = ['A', 'B', 'C'].map(
			(tag) => `UPD_${tag}: ${sha256Hex(`${FIXTURE_SEED}:${name}:upd${tag}`).slice(0, 24)}`,
		);
		const original = `${originalLines.join('\n')}\n`;
		const expected = `${original}${appendLines.join('\n')}\n`;
		files.push({
			name,
			original,
			originalLines: originalLines.length,
			appendLines,
			expected,
			expectedSha: sha256Hex(expected),
		});
	}
	const repoDigest = sha256Hex(
		JSON.stringify(files.map((file) => [file.name, sha256Hex(file.original)])),
	);
	const changes = {
		note: 'Append every line in append_lines to the end of the target file. Do not change existing lines.',
		files: files.map((file) => ({ path: file.name, append_lines: file.appendLines })),
	};
	return { payload, files, changes, repoDigest };
}

function canonicalArtifact(fixture) {
	const manifest = fixture.files.map((file) => ({
		path: file.name,
		old_sha256: sha256Hex(file.original),
		old_lines: file.originalLines,
		append_lines: file.appendLines,
		new_sha256: file.expectedSha,
		diff: `@@ -${file.originalLines},0 +${file.originalLines + 1},${file.appendLines.length} @@\n${file.appendLines
			.map((line) => `+${line}`)
			.join('\n')}`,
	}));
	return {
		artifact_id: `change-${fixture.repoDigest.slice(0, 16)}`,
		parents: [`fixture:${fixture.payload}@${fixture.repoDigest.slice(0, 16)}`],
		manifest,
		summary: `Append ${fixture.files[0].appendLines.length} UPDATE lines to each of ${fixture.files.length} file(s).`,
	};
}

function artifactText(artifact) {
	return `${JSON.stringify(artifact, null, 2)}\n`;
}

function validateArtifact(artifact, fixture) {
	const problems = [];
	if (artifact === null || typeof artifact !== 'object')
		return { valid: false, problems: ['artifact is not an object'] };
	if (typeof artifact.artifact_id !== 'string' || artifact.artifact_id.length === 0)
		problems.push('missing artifact_id');
	if (!Array.isArray(artifact.parents)) problems.push('missing parents array');
	if (typeof artifact.summary !== 'string') problems.push('missing summary');
	const manifest = Array.isArray(artifact.manifest) ? artifact.manifest : [];
	if (manifest.length !== fixture.files.length)
		problems.push(`manifest length ${manifest.length} != ${fixture.files.length}`);
	const byName = new Map(manifest.map((entry) => [entry?.path, entry]));
	for (const file of fixture.files) {
		const entry = byName.get(file.name);
		if (entry === undefined) {
			problems.push(`missing manifest entry for ${file.name}`);
			continue;
		}
		if (
			!Array.isArray(entry.append_lines) ||
			entry.append_lines.length !== file.appendLines.length
		) {
			problems.push(`${file.name}: append_lines length mismatch`);
			continue;
		}
		if (JSON.stringify(entry.append_lines) !== JSON.stringify(file.appendLines)) {
			problems.push(`${file.name}: append_lines differ from changes.json`);
		}
		if (typeof entry.diff !== 'string' || entry.diff.length === 0) {
			problems.push(`${file.name}: missing diff`);
		} else {
			const plusLines = entry.diff
				.split(/\r?\n/u)
				.filter((line) => line.startsWith('+'))
				.map((line) => line.slice(1));
			if (JSON.stringify(plusLines) !== JSON.stringify(file.appendLines)) {
				problems.push(`${file.name}: diff +lines differ from append_lines`);
			}
		}
	}
	return { valid: problems.length === 0, problems: problems.slice(0, 8) };
}

async function writeFixtureWorkspaceAsync(dir, fixture) {
	const repoDir = path.join(dir, 'repo');
	await mkdir(repoDir, { recursive: true });
	for (const file of fixture.files)
		await writeFile(path.join(repoDir, file.name), file.original, 'utf8');
	await writeFile(
		path.join(dir, 'changes.json'),
		`${JSON.stringify(fixture.changes, null, 2)}\n`,
		'utf8',
	);
}

async function copyRepo(dir, fixture) {
	const repoDir = path.join(dir, 'repo');
	await mkdir(repoDir, { recursive: true });
	for (const file of fixture.files)
		await writeFile(path.join(repoDir, file.name), file.original, 'utf8');
}

// ---------------------------------------------------------------------------
// Producer preparation: freeze artifact + prose once per payload
// ---------------------------------------------------------------------------
function producerPrompt(fixture) {
	return [
		'You are the producer agent in a two-agent pipeline. Work only in the current directory.',
		'repo/ contains the original files. changes.json contains, for every file, the exact lines to append.',
		'Produce exactly one artifact file named change-artifact.json with this shape:',
		'{"artifact_id":"change-<16+ hex>","parents":["fixture:<payload>@<digest>"],"manifest":[{"path":"<file name>","old_sha256":"<64 hex>","old_lines":<number>,"append_lines":["<line>",...],"new_sha256":"<64 hex>","diff":"@@ -N,0 +N+1,3 @@\\n+<line>\\n+<line>\\n+<line>"}],"summary":"<one sentence>"}',
		'Rules: copy append_lines exactly from changes.json; compute sha256 of the original bytes for old_sha256 and of the final bytes for new_sha256; the diff must contain exactly the appended lines prefixed with "+". Write valid JSON only.',
		'After writing the artifact, reply with ONE prose handoff for the next agent.',
		`The next agent can read repo/ but cannot see changes.json or your artifact. The handoff must be at most ${PROSE_LIMIT} characters and must be sufficient to reproduce the exact final content. Do not paste the artifact JSON.`,
	].join('\n');
}

async function preparePayload({ payload, args, real, fixedDir }) {
	const fixture = makeFixture(payload);
	const payloadFixedDir = path.join(fixedDir, payload);
	await mkdir(payloadFixedDir, { recursive: true });
	await writeFixtureWorkspaceAsync(payloadFixedDir, fixture);
	await writeJsonFile(path.join(payloadFixedDir, 'fixture-meta.json'), {
		payload,
		fileCount: fixture.files.length,
		repoDigest: fixture.repoDigest,
		expected: fixture.files.map((file) => ({ name: file.name, sha256: file.expectedSha })),
	});

	// Reuse an already frozen producer artifact unless --force-prepare is set.
	const cached = await loadCachedFixed(payloadFixedDir, fixture);
	if (cached !== null && !args.forcePrepare) {
		return { ...cached, fixture };
	}

	const canonical = canonicalArtifact(fixture);
	let artifact = canonical;
	let artifactSource = 'smoke-canonical';
	let prose = `Append the lines listed in the change artifact to the end of each file. The artifact lists ${fixture.files.length} file(s).`;
	let producerMetrics = null;
	let artifactValid = true;

	if (real) {
		const prepared = await runProducer({ payload, fixture, args, fixedDir: payloadFixedDir });
		producerMetrics = prepared.metrics;
		prose = prepared.prose;
		if (prepared.artifact !== null) {
			const validation = validateArtifact(prepared.artifact, fixture);
			artifact = prepared.artifact;
			artifactSource = 'producer';
			artifactValid = validation.valid;
			prepared.validation = validation;
			if (!validation.valid) {
				console.warn(
					`[m1ab] producer artifact invalid for ${payload}: ${validation.problems.join('; ')}`,
				);
				// Fall back to the canonical artifact so arm B measures the
				// handoff representation, not a broken producer. Recorded here.
				artifact = canonical;
				artifactSource = 'host-fallback';
				artifactValid = true;
			}
		} else {
			artifactSource = 'host-fallback';
			producerMetrics = prepared.metrics;
		}
	}

	const text = artifactText(artifact);
	await writeFile(path.join(payloadFixedDir, 'change-artifact.json'), text, 'utf8');
	await writeFile(path.join(payloadFixedDir, 'handoff-prose.txt'), `${prose}\n`, 'utf8');
	const meta = {
		payload,
		fileCount: fixture.files.length,
		artifactSource,
		artifactValid,
		artifactDigest: sha256Hex(text),
		artifactPath: path.join(payloadFixedDir, 'change-artifact.json'),
		artifactSummary: artifact.summary ?? '',
		expected: fixture.files.map((file) => ({ name: file.name, sha256: file.expectedSha })),
		proseChars: prose.length,
		prose,
		producer: producerMetrics,
	};
	await writeJsonFile(path.join(payloadFixedDir, 'meta.json'), meta);
	return {
		...meta,
		expected: fixture.files.map((file) => ({ name: file.name, sha256: file.expectedSha })),
		fixture,
	};
}

/** Reuse the frozen producer artifact when it is present and still valid. */
async function loadCachedFixed(payloadFixedDir, fixture) {
	const meta = parseJsonOrNull(await readFileStrict(path.join(payloadFixedDir, 'meta.json')));
	const artifact = parseJsonOrNull(
		await readFileStrict(path.join(payloadFixedDir, 'change-artifact.json')),
	);
	const proseText = await readFileStrict(path.join(payloadFixedDir, 'handoff-prose.txt'));
	if (meta === null || artifact === null || !Array.isArray(meta.expected)) return null;
	const validation = validateArtifact(artifact, fixture);
	if (!validation.valid) return null;
	if (meta.artifactSource === 'producer' && meta.artifactValid !== true) return null;
	return {
		...meta,
		artifactPath: path.join(payloadFixedDir, 'change-artifact.json'),
		prose: (proseText ?? meta.prose ?? '').replace(/\r?\n$/u, ''),
		reusedFixedArtifact: true,
	};
}

async function runProducer({ payload, fixture, args, fixedDir }) {
	const workDir = await makeTempDir(`m1ab-producer-${payload}-`);
	const seeded = await seedIsolatedHome();
	const baseHome = seeded.home;
	await writeFixtureWorkspaceAsync(workDir, fixture);
	const recorder = new Recorder(path.join(fixedDir, 'producer'));
	const harness = new Harness({
		exePath: args.exe,
		env: { ...process.env, EASYCODE_HOME: baseHome },
		homeMode: 'per-agent',
		easycodeHome: baseHome,
		agentId: 'producer',
		cwd: workDir,
		outDir: path.join(fixedDir, 'producer'),
		recorder,
		approvalTimeoutMs: 120_000,
		events: { onApprovalRequest: () => 'accept' },
	});
	let artifact = null;
	let prose = '';
	let metrics = null;
	let lastError = null;
	try {
		await harness.start();
		const thread = await harness.startThread({
			cwd: workDir,
			approvalPolicy: 'on-request',
			sandbox: 'workspace-write',
			ephemeral: false,
		});
		for (let attempt = 1; attempt <= 3; attempt += 1) {
			const prompt =
				attempt === 1
					? producerPrompt(fixture)
					: `${producerPrompt(fixture)}\n\nYour previous artifact failed validation: ${lastError}\nRegenerate change-artifact.json and reply with the prose handoff again.`;
			const turn = await harness.runTurn(prompt, {
				threadId: thread.thread.id,
				sandboxPolicy: WORKSPACE_WRITE_SANDBOX(workDir),
				timeoutMs: 300_000,
			});
			const raw = await readFileStrict(path.join(workDir, 'change-artifact.json'));
			const parsed = parseJsonOrNull(raw);
			prose = (turn.agentText ?? '').slice(0, PROSE_LIMIT);
			metrics = {
				attempt,
				status: turn.status,
				wallMs: turn.wallMs,
				tokens: turn.usage?.turnTotalDelta ?? null,
				proseChars: (turn.agentText ?? '').length,
				proseTruncated: (turn.agentText ?? '').length > PROSE_LIMIT,
			};
			if (parsed !== null) {
				const validation = validateArtifact(parsed, fixture);
				if (validation.valid) {
					artifact = parsed;
					break;
				}
				lastError = validation.problems.join('; ');
				artifact = parsed;
			} else {
				lastError = 'change-artifact.json is missing or not valid JSON';
			}
		}
	} finally {
		await harness.shutdown().catch(() => undefined);
		recorder.close();
		await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
		await rm(baseHome, { recursive: true, force: true }).catch(() => undefined);
	}
	return { artifact, prose, metrics };
}

// ---------------------------------------------------------------------------
// Consumer run
// ---------------------------------------------------------------------------
async function runConsumer({ payload, arm, runIndex, fixed, args, real, outDir }) {
	const fixture = fixed.fixture;
	const root = await makeTempDir(`m1ab-consumer-${payload}-${arm}-${runIndex}-`);
	// The consumer root is a fresh temp directory, not a sibling of the producer
	// or of the fixed-artifact directory.
	await copyRepo(root, fixture);
	await mkdir(path.join(root, 'out'), { recursive: true });

	// A fresh EASYCODE_HOME for this single run. Reusing one base home let a
	// consumer read earlier runs' rollout JSONL (which contains handoff payloads)
	// out of a sibling per-agent home.
	const runHome = real ? (await seedIsolatedHome()).home : await makeTempDir('m1ab-run-home-');

	const artifactPath = path.join(root, 'source', 'change-artifact.json');
	if (arm === 'b') {
		await mkdir(path.dirname(artifactPath), { recursive: true });
		await copyFile(path.join(fixed.artifactPath), artifactPath);
	}

	const expectedFiles = fixed.fixture.files.map((file) => ({ ...file }));
	const prompt = buildConsumerPrompt({ arm, payload, fixture, fixed, artifactPath });
	const recorder = new Recorder(outDir);
	const isSmoke = !real;
	const harnessOptions = isSmoke
		? {
				exePath: process.execPath,
				appServerArgs: [FAKE_SERVER_PATH],
				env: {
					...process.env,
					FAKE_MODE: 'no-approval',
					FAKE_USAGE: '1',
					FAKE_WRITE_FILES_JSON: JSON.stringify(
						Object.fromEntries(expectedFiles.map((file) => [`out/${file.name}`, file.expected])),
					),
				},
			}
		: {
				exePath: args.exe,
				env: { ...process.env, EASYCODE_HOME: runHome },
				homeMode: 'per-agent',
				easycodeHome: runHome,
				agentId: 'consumer',
			};
	const harness = new Harness({
		...harnessOptions,
		cwd: root,
		outDir,
		recorder,
		approvalTimeoutMs: 120_000,
		events: { onApprovalRequest: () => 'accept' },
	});

	const result = {
		payload,
		arm,
		runIndex,
		status: 'completed',
		root,
		source: arm === 'a' ? 'prose' : 'artifact',
		proseChars: arm === 'a' ? fixed.proseChars : null,
		artifactDigest: arm === 'b' ? fixed.artifactDigest : null,
		tokens: null,
		wallMs: null,
		firstPassSuccess: false,
		reworkCount: 0,
		finalSuccess: false,
		protocolErrors: 0,
		approvals: 0,
		traversalCommands: [],
		producerPathMentions: [],
		artifactVisibleInRoot: false,
		firstFailures: [],
		rework: [],
	};
	try {
		await harness.start();
		const thread = await harness.startThread({
			cwd: root,
			approvalPolicy: 'on-request',
			sandbox: 'workspace-write',
			ephemeral: false,
		});
		const firstTurn = await harness.runTurn(prompt, {
			threadId: thread.thread.id,
			sandboxPolicy: WORKSPACE_WRITE_SANDBOX(root),
			timeoutMs: 300_000,
		});
		const firstVerification = await verifyOut(root, expectedFiles);
		result.firstPassSuccess = firstVerification.ok;
		result.firstFailures = firstVerification.failures.slice(0, 5);
		result.firstTurn = turnSummary(firstTurn);
		result.firstCommands = commandLines(firstTurn);
		const turns = [firstTurn];
		let verification = firstVerification;
		while (!verification.ok && result.reworkCount < args.repairAttempts) {
			const repair = buildRepairPrompt({ arm, fixed, artifactPath, verification });
			const repairTurn = await harness.runTurn(repair, {
				threadId: thread.thread.id,
				sandboxPolicy: WORKSPACE_WRITE_SANDBOX(root),
				timeoutMs: 300_000,
			});
			const repairVerification = await verifyOut(root, expectedFiles);
			result.rework.push({
				turn: turnSummary(repairTurn),
				commands: commandLines(repairTurn),
				verification: repairVerification,
			});
			turns.push(repairTurn);
			result.reworkCount += 1;
			verification = repairVerification;
		}
		result.finalSuccess = verification.ok;
		result.verification = verification;
		result.tokens = {
			consumerTotal: turns.reduce(
				(total, turn) => total + (turn.usage?.turnTotalDelta?.totalTokens ?? 0),
				0,
			),
			consumerFirst: firstTurn.usage?.turnTotalDelta?.totalTokens ?? null,
			outputTotal: turns.reduce(
				(total, turn) => total + (turn.usage?.turnTotalDelta?.outputTokens ?? 0),
				0,
			),
			usageAvailable: turns.every((turn) => turn.usage?.available === true),
		};
		result.wallMs = turns.reduce((total, turn) => total + (turn.wallMs ?? 0), 0);
		result.firstWallMs = firstTurn.wallMs;
		result.turnCount = turns.length;
		result.protocolErrors = harness.health().transport.protocolErrors;
		result.approvals = recorder.approvalRequests.length;
		result.isolation = await checkIsolation(root, result.firstCommands, result.rework);
		result.artifactVisibleInRoot = await fileExists(artifactPath);
	} catch (error) {
		result.status = 'error';
		result.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
		result.stack = error instanceof Error ? error.stack : null;
	} finally {
		await harness.shutdown().catch(() => undefined);
		recorder.close();
		await rm(root, { recursive: true, force: true }).catch(() => undefined);
		await rm(runHome, { recursive: true, force: true }).catch(() => undefined);
	}
	return result;
}

function buildConsumerPrompt({ arm, payload, fixture, fixed, artifactPath }) {
	const fileList = fixture.files.map((file) => file.name).join(', ');
	const header = [
		'You are the implementation agent in a two-agent pipeline. Work only in the current directory.',
		'repo/ contains the original files and must not be modified.',
		`For each of these files: ${fileList}. Append the described lines to the end of the original file and write the exact final content to out/<file name> (create out/).`,
		'Only append lines; never change or reorder existing lines. Write nothing else.',
	];
	const source =
		arm === 'a'
			? [
					'The producer finished. Its entire handoff is this prose message:',
					'--- HANDOFF START ---',
					fixed.prose,
					'--- HANDOFF END ---',
					'No artifact is available to you. Use only this prose.',
				]
			: [
					'The producer finished and produced a structured handoff:',
					JSON.stringify(
						{
							artifact_ref: {
								path: 'source/change-artifact.json',
								digest: `sha256:${fixed.artifactDigest}`,
							},
							conclusion_proposed: {
								parents: [`fixture:${payload}@${fixture.repoDigest.slice(0, 16)}`],
								summary: fixed.artifactSummary,
								file_count: fixture.files.length,
								total_lines_added: fixture.files.reduce(
									(total, file) => total + file.appendLines.length,
									0,
								),
								digest: `sha256:${fixed.artifactDigest}`,
							},
						},
						null,
						2,
					),
					'Read the artifact at artifact_ref.path and apply every manifest entry (append_lines/diff).',
				];
	return [...header, ...source].join('\n');
}

function buildRepairPrompt({ arm, fixed, artifactPath, verification }) {
	const failure = verification.failures[0] ?? 'unknown mismatch';
	const header = `Your previous out/ files failed verification: ${failure}\nRewrite the out/ files with the exact final content.`;
	const source =
		arm === 'a'
			? [
					'The producer handoff (prose only):',
					'--- HANDOFF START ---',
					fixed.prose,
					'--- HANDOFF END ---',
				]
			: ['The structured handoff is unchanged; read it again:', artifactPath];
	return [header, ...source].join('\n');
}

async function verifyOut(root, expectedFiles) {
	const failures = [];
	let passed = 0;
	for (const file of expectedFiles) {
		const actual = await readFileStrict(path.join(root, 'out', file.name));
		if (actual === null) {
			failures.push(`out/${file.name} is missing`);
			continue;
		}
		// Compare line content, not trailing whitespace or CRLF style: those are
		// platform details, not handoff fidelity.
		if (normalizeLines(actual) !== normalizeLines(file.expected)) {
			const actualLines = normalizeLines(actual).split('\n').length;
			failures.push(
				`out/${file.name} differs (expected ${file.expected.split('\n').length} lines, got ${actualLines})`,
			);
			continue;
		}
		passed += 1;
	}
	return { ok: passed === expectedFiles.length, passed, total: expectedFiles.length, failures };
}

function normalizeLines(text) {
	return `${text ?? ''}`
		.replaceAll('\r\n', '\n')
		.replace(/[ \t]+$/gmu, '')
		.replace(/\n+$/u, '');
}

async function checkIsolation(root, commands, rework) {
	const allCommands = [
		...(commands ?? []),
		...(rework ?? []).flatMap((entry) => entry.commands ?? []),
	];
	const traversal = allCommands.filter((command) => /(^|[\s"'])\.\.([/\\\s"']|$)/u.test(command));
	const producerMentions = allCommands.filter((command) =>
		/m1ab-producer|producer-ws|\.artifacts[/\\]m1ab/u.test(command),
	);
	// easyCode home sessions/rollout logs contain past prompts and tool output.
	// A consumer reading a home that is not its own is a read-isolation break.
	const sessionLogReads = allCommands.filter((command) =>
		/agents[/\\]|rollout-|easycode-home-|session_index|sessions[/\\]/u.test(command),
	);
	const outsideRoot = allCommands.filter((command) => {
		const matches = command.match(/[A-Za-z]:\\[^"']+/gu) ?? [];
		return matches.some(
			(candidate) =>
				!candidate.startsWith(root) &&
				/m1ab|poc-|\.artifacts|\\Temp\\/iu.test(candidate) &&
				!/C:\\Windows|C:\\Program Files/iu.test(candidate),
		);
	});
	return {
		commandCount: allCommands.length,
		traversalCommands: traversal.slice(0, 5),
		producerPathMentions: producerMentions.slice(0, 5),
		sessionLogReads: sessionLogReads.slice(0, 5),
		absolutePathsOutsideRoot: outsideRoot.slice(0, 5),
		// easyCode workspaceWrite does not restrict reads, so absolute-path reads
		// outside the root cannot be prohibited; we record them instead.
		unprohibitable: 'workspaceWrite sandbox read access is not path-restricted',
	};
}

function commandLines(turn) {
	return (turn.items ?? [])
		.filter((item) => item.type === 'commandExecution' && typeof item.command === 'string')
		.map((item) => item.command);
}

function turnSummary(turn) {
	return {
		turnId: turn.turnId,
		status: turn.status,
		wallMs: turn.wallMs,
		error: turn.error,
		timeoutError: turn.timeoutError,
		agentText: turn.agentText,
		usage: turn.usage,
	};
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

async function readFileStrict(filePath) {
	try {
		return await readFile(filePath, 'utf8');
	} catch {
		return null;
	}
}

async function fileExists(filePath) {
	try {
		await readFile(filePath);
		return true;
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// Aggregation and report
// ---------------------------------------------------------------------------
function roundRatio(value) {
	return Math.round(value * 1000) / 1000;
}

function aggregateAll(runs) {
	const groups = {};
	for (const run of runs) {
		const key = `${run.payload}/${run.arm}`;
		if (groups[key] === undefined) groups[key] = [];
		groups[key].push(run);
	}
	const aggregate = {};
	for (const [key, group] of Object.entries(groups)) {
		const completed = group.filter((run) => run.status === 'completed');
		const count = completed.length;
		const mean = (selector) => {
			const values = completed.map(selector).filter((value) => typeof value === 'number');
			return values.length === 0
				? null
				: Math.round(values.reduce((total, value) => total + value, 0) / values.length);
		};
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
		aggregate[key] = {
			runs: count,
			errors: group.length - count,
			firstPassSuccesses: completed.filter((run) => run.firstPassSuccess).length,
			firstPassRate:
				count === 0
					? null
					: roundRatio(completed.filter((run) => run.firstPassSuccess).length / count),
			finalSuccesses: completed.filter((run) => run.finalSuccess).length,
			finalSuccessRate:
				count === 0 ? null : roundRatio(completed.filter((run) => run.finalSuccess).length / count),
			reworkTotal: completed.reduce((total, run) => total + (run.reworkCount ?? 0), 0),
			reworkRuns: completed.filter((run) => (run.reworkCount ?? 0) > 0).length,
			consumerTokensMean: mean((run) => run.tokens?.consumerTotal),
			consumerTokensMedian: median((run) => run.tokens?.consumerTotal),
			consumerFirstTokensMean: mean((run) => run.tokens?.consumerFirst),
			firstWallMean: mean((run) => run.firstWallMs),
			firstWallMedian: median((run) => run.firstWallMs),
			totalWallMean: mean((run) => run.wallMs),
			turnsMean: mean((run) => run.turnCount),
			protocolErrors: completed.reduce((total, run) => total + (run.protocolErrors ?? 0), 0),
			traversalAttempts: completed.reduce(
				(total, run) => total + (run.isolation?.traversalCommands?.length ?? 0),
				0,
			),
			producerPathAttempts: completed.reduce(
				(total, run) => total + (run.isolation?.producerPathMentions?.length ?? 0),
				0,
			),
			sessionLogAttempts: completed.reduce(
				(total, run) => total + (run.isolation?.sessionLogReads?.length ?? 0),
				0,
			),
		};
	}
	return aggregate;
}

function printReport(summary, payloads) {
	console.log('\n=== M1 A/B handoff baseline ===');
	console.log(`mode: ${summary.meta.kind}, runs per arm per payload: ${summary.meta.runsPerArm}`);
	for (const payload of payloads) {
		const a = summary.aggregate[`${payload}/a`];
		const b = summary.aggregate[`${payload}/b`];
		console.log(`\n[${payload}] (${summary.fixed[payload].fileCount} file(s))`);
		const rows = [
			['A first-pass', `${a?.firstPassSuccesses}/${a?.runs}`],
			['B first-pass', `${b?.firstPassSuccesses}/${b?.runs}`],
			['A final', `${a?.finalSuccesses}/${a?.runs}`],
			['B final', `${b?.finalSuccesses}/${b?.runs}`],
			['A rework turns', a?.reworkTotal],
			['B rework turns', b?.reworkTotal],
			['A consumer tokens (mean)', a?.consumerTokensMean],
			['B consumer tokens (mean)', b?.consumerTokensMean],
			['A first-turn wall ms (mean)', a?.firstWallMean],
			['B first-turn wall ms (mean)', b?.firstWallMean],
			['A protocol errors', a?.protocolErrors],
			['B protocol errors', b?.protocolErrors],
			['A traversal attempts', a?.traversalAttempts],
			['B producer-path attempts', b?.producerPathAttempts],
			['A session-log reads', a?.sessionLogAttempts],
			['B session-log reads', b?.sessionLogAttempts],
		];
		for (const [label, value] of rows) console.log(`${label.padEnd(32)} ${value}`);
	}
	console.log(`\nArtifacts: ${summary.meta.outDir}`);
}

main().catch((error) => {
	console.error('[m1ab] fatal:', error);
	process.exitCode = 1;
});
