#!/usr/bin/env node
/**
 * Regenerate and diff the easyCode app-server protocol surface.
 *
 * The script runs the locked binary:
 *   easycode --version
 *   easycode app-server generate-ts --out <tmp>
 *   easycode app-server generate-json-schema --out <tmp>
 *
 * Then it computes per-file sha256 values, a snapshot hash over the sorted
 * file list, and checks every whitelisted wire method and payload type against
 * the generated bindings. Compare the result with
 * `packages/@pong/easycode-runtime/runtime.lock.json`.
 *
 * Usage:
 *   node scripts/schema-diff.mjs                 # check against the lock
 *   node scripts/schema-diff.mjs --write         # update the lock
 *   node scripts/schema-diff.mjs --json          # machine-readable output
 *   node scripts/schema-diff.mjs --skip-json-schema
 *   node scripts/schema-diff.mjs --exe <path>
 *
 * The check mode needs the package build, because it imports the whitelist from
 * `packages/@pong/easycode-runtime/dist/protocol/methods.js`.
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const PACKAGE_DIR = path.join(REPO_ROOT, 'packages', '@pong', 'easycode-runtime');
const LOCK_PATH = path.join(PACKAGE_DIR, 'runtime.lock.json');
const METHODS_DIST = path.join(PACKAGE_DIR, 'dist', 'protocol', 'methods.js');
const RUNTIME_PROTOCOL_DIR = path.join(PACKAGE_DIR, 'src', 'protocol');
const DEFAULT_EXE =
	'C:\\Users\\NJHTR\\IdeaProjects\\easyCode\\dist\\easyCode-windows-x64-portable\\bin\\easycode.exe';

const REQUIRED_GENERATED_TYPES = [
	'InitializeParams.ts',
	'InitializeResponse.ts',
	'ClientRequest.ts',
	'ClientNotification.ts',
	'ServerRequest.ts',
	'ServerNotification.ts',
	'v2/ThreadStartParams.ts',
	'v2/ThreadStartResponse.ts',
	'v2/ThreadResumeParams.ts',
	'v2/ThreadResumeResponse.ts',
	'v2/Thread.ts',
	'v2/TurnStartParams.ts',
	'v2/TurnStartResponse.ts',
	'v2/Turn.ts',
	'v2/TurnInterruptParams.ts',
	'v2/TurnInterruptResponse.ts',
	'v2/SandboxPolicy.ts',
	'v2/CommandExecutionRequestApprovalParams.ts',
	'v2/CommandExecutionRequestApprovalResponse.ts',
	'v2/FileChangeRequestApprovalParams.ts',
	'v2/FileChangeRequestApprovalResponse.ts',
	'v2/DynamicToolSpec.ts',
	'v2/DynamicToolCallParams.ts',
	'v2/DynamicToolCallResponse.ts',
];

const METHOD_FILES = {
	client: 'ClientRequest.ts',
	clientNotification: 'ClientNotification.ts',
	serverRequest: 'ServerRequest.ts',
	serverNotification: 'ServerNotification.ts',
};

function parseArgs(argv) {
	const args = {
		write: false,
		json: false,
		skipJsonSchema: false,
		exe: process.env.EASYCODE_EXE ?? null,
	};
	for (let i = 0; i < argv.length; i += 1) {
		const key = argv[i];
		if (key === '--write') args.write = true;
		else if (key === '--check') args.check = true;
		else if (key === '--json') args.json = true;
		else if (key === '--skip-json-schema') args.skipJsonSchema = true;
		else if (key === '--exe') {
			args.exe = argv[i + 1];
			i += 1;
		} else if (key === '--help' || key === '-h') {
			console.log('See the header comment of scripts/schema-diff.mjs for the flags.');
			process.exit(0);
		} else {
			throw new Error(`Unknown argument: ${key}`);
		}
	}
	return args;
}

function sha256(data) {
	return createHash('sha256').update(data).digest('hex');
}

async function walkFiles(root) {
	const found = [];
	async function walk(directory) {
		const entries = await readdir(directory, { withFileTypes: true });
		for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
			const fullPath = path.join(directory, entry.name);
			if (entry.isDirectory()) await walk(fullPath);
			else if (entry.isFile()) found.push(fullPath);
		}
	}
	await walk(root);
	return found;
}

function toPosix(relativePath) {
	return relativePath.split(path.sep).join('/');
}

async function snapshot(directory) {
	const files = await walkFiles(directory);
	const entries = [];
	for (const file of files) {
		const content = await readFile(file);
		entries.push({ path: toPosix(path.relative(directory, file)), sha256: sha256(content) });
	}
	const sorted = entries
		.slice()
		.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
	const lines = sorted.map((entry) => `${entry.path} ${entry.sha256}\n`).join('');
	return {
		fileCount: entries.length,
		v2FileCount: entries.filter((entry) => entry.path.startsWith('v2/')).length,
		snapshotHash: sha256(`easycode-app-server-protocol-snapshot-v1\n${lines}`),
	};
}

async function runtimeProtocolSnapshot() {
	const files = await walkFiles(RUNTIME_PROTOCOL_DIR);
	const entries = [];
	for (const file of files) {
		const content = await readFile(file);
		entries.push({
			path: toPosix(path.relative(RUNTIME_PROTOCOL_DIR, file)),
			sha256: sha256(content),
		});
	}
	const sorted = entries
		.slice()
		.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
	const lines = sorted.map((entry) => `${entry.path} ${entry.sha256}\n`).join('');
	return {
		fileCount: entries.length,
		snapshotHash: sha256(`easycode-runtime-protocol-subset-v1\n${lines}`),
		files: sorted.map((entry) => entry.path),
	};
}

function readWorkspaceWriteNetworkAccess(text) {
	const marker = text.indexOf('"type": "workspaceWrite"');
	if (marker < 0) return 'missing';
	const segment = text.slice(marker, marker + 500);
	const field = /networkAccess:\s*([A-Za-z]+)/u.exec(segment);
	return field === null ? 'missing' : field[1];
}

/**
 * The runtime's hand-written SandboxPolicy must match the generated wire shape.
 * M0 A/B runs failed 6/6 because this field was typed as a string enum.
 */
async function verifyShapeGuards(tsDir) {
	const errors = [];
	let workspaceWriteNetworkAccess = 'missing';
	try {
		const text = await readFile(path.join(tsDir, 'v2', 'SandboxPolicy.ts'), 'utf8');
		workspaceWriteNetworkAccess = readWorkspaceWriteNetworkAccess(text);
	} catch {
		errors.push('missing generated file v2/SandboxPolicy.ts');
	}
	if (workspaceWriteNetworkAccess !== 'boolean') {
		errors.push(
			`SandboxPolicy.workspaceWrite.networkAccess is "${workspaceWriteNetworkAccess}", expected "boolean"`,
		);
	}
	return {
		shapeGuards: { sandboxPolicyWorkspaceWriteNetworkAccess: workspaceWriteNetworkAccess },
		errors,
	};
}

async function readLock() {
	try {
		const text = await readFile(LOCK_PATH, 'utf8');
		return JSON.parse(text);
	} catch {
		return null;
	}
}

async function loadWhitelist() {
	try {
		const module = await import(pathToFileURL(METHODS_DIST).href);
		const loaded = typeof module.CLIENT_METHODS === 'object' ? module : module.default;
		if (loaded === undefined || loaded === null || typeof loaded.WHITELISTED_METHODS !== 'object') {
			throw new Error('WHITELISTED_METHODS is missing from the compiled package');
		}
		return {
			whitelist: {
				client: [...loaded.WHITELISTED_METHODS.client].sort(),
				clientNotification: [...loaded.WHITELISTED_METHODS.clientNotification].sort(),
				serverRequest: [...loaded.WHITELISTED_METHODS.serverRequest].sort(),
				serverNotification: [...loaded.WHITELISTED_METHODS.serverNotification].sort(),
			},
		};
	} catch (error) {
		throw new Error(
			`Cannot load the protocol whitelist from ${METHODS_DIST}. Build the package first: ` +
				`pnpm --filter @pong/easycode-runtime build. Cause: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

async function readVersion(exe) {
	const { stdout, stderr } = await execFileAsync(exe, ['--version'], {
		windowsHide: true,
		timeout: 60_000,
	});
	return (stdout || stderr).trim();
}

async function generateTs(exe, outDir) {
	await execFileAsync(exe, ['app-server', 'generate-ts', '--out', outDir], {
		windowsHide: true,
		timeout: 300_000,
	});
}

async function generateJsonSchema(exe, outDir) {
	await execFileAsync(exe, ['app-server', 'generate-json-schema', '--out', outDir], {
		windowsHide: true,
		timeout: 300_000,
	});
}

function extractMethods(text) {
	const methods = new Set();
	const pattern = /"method":\s*"([^"]+)"/gu;
	let match = pattern.exec(text);
	while (match !== null) {
		methods.add(match[1]);
		match = pattern.exec(text);
	}
	return methods;
}

async function verifyWhitelist(tsDir, whitelist) {
	const errors = [];
	const methodSets = {};
	for (const [group, fileName] of Object.entries(METHOD_FILES)) {
		const filePath = path.join(tsDir, fileName);
		let text;
		try {
			text = await readFile(filePath, 'utf8');
		} catch {
			errors.push(`missing generated file ${fileName}`);
			continue;
		}
		const methods = extractMethods(text);
		methodSets[group] = methods;
		for (const method of whitelist[group]) {
			if (!methods.has(method)) errors.push(`method "${method}" is missing from ${fileName}`);
		}
	}
	for (const requiredType of REQUIRED_GENERATED_TYPES) {
		try {
			await readFile(path.join(tsDir, requiredType), 'utf8');
		} catch {
			errors.push(`required payload type ${requiredType} is missing`);
		}
	}
	return {
		errors,
		methodCounts: Object.fromEntries(
			Object.entries(methodSets).map(([group, set]) => [group, set.size]),
		),
	};
}

function sameJson(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const existingLock = await readLock();
	const exe =
		args.exe ?? existingLock?.easycode?.exePath ?? process.env.EASYCODE_EXE ?? DEFAULT_EXE;
	const version = await readVersion(exe);
	const exeBytes = await readFile(exe);
	const { whitelist } = await loadWhitelist();
	const whitelistHash = sha256(JSON.stringify(whitelist));
	const runtimeProtocol = await runtimeProtocolSnapshot();

	const tsDir = await mkdtemp(path.join(tmpdir(), 'easycode-schema-ts-'));
	const jsonDir = await mkdtemp(path.join(tmpdir(), 'easycode-schema-json-'));
	const errors = [];
	let generateTsSnapshot;
	let generateJsonSchemaSnapshot = null;
	let methodCounts = null;
	let shapeGuards = null;
	try {
		await generateTs(exe, tsDir);
		generateTsSnapshot = await snapshot(tsDir);
		const verification = await verifyWhitelist(tsDir, whitelist);
		errors.push(...verification.errors);
		methodCounts = verification.methodCounts;
		const shapeResult = await verifyShapeGuards(tsDir);
		errors.push(...shapeResult.errors);
		shapeGuards = shapeResult.shapeGuards;
		if (!args.skipJsonSchema) {
			await generateJsonSchema(exe, jsonDir);
			generateJsonSchemaSnapshot = await snapshot(jsonDir);
		}
	} finally {
		await rm(tsDir, { recursive: true, force: true });
		await rm(jsonDir, { recursive: true, force: true });
	}

	const lock = {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		easycode: {
			version,
			exePath: exe,
			exeSha256: sha256(exeBytes),
		},
		schema: {
			generateTs: generateTsSnapshot,
			generateJsonSchema: generateJsonSchemaSnapshot,
		},
		protocol: {
			whitelist,
			whitelistHash,
			methodCounts,
			requiredTypes: REQUIRED_GENERATED_TYPES,
			shapeGuards,
			runtimeSubset: runtimeProtocol,
		},
	};

	if (args.write) {
		await writeFile(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
	}

	const diffs = [];
	if (!args.write) {
		if (existingLock === null) {
			diffs.push('runtime.lock.json is missing; run with --write');
		} else {
			if (existingLock.easycode?.version !== lock.easycode.version) {
				diffs.push(
					`version changed: ${existingLock.easycode?.version} -> ${lock.easycode.version}`,
				);
			}
			if (existingLock.easycode?.exeSha256 !== lock.easycode.exeSha256) {
				diffs.push(
					`exe sha256 changed: ${existingLock.easycode?.exeSha256} -> ${lock.easycode.exeSha256}`,
				);
			}
			if (existingLock.schema?.generateTs?.snapshotHash !== lock.schema.generateTs.snapshotHash) {
				diffs.push(
					`generate-ts snapshot changed: ${existingLock.schema?.generateTs?.snapshotHash} -> ${lock.schema.generateTs.snapshotHash}`,
				);
			}
			if (
				generateJsonSchemaSnapshot !== null &&
				existingLock.schema?.generateJsonSchema?.snapshotHash !==
					lock.schema.generateJsonSchema?.snapshotHash
			) {
				diffs.push(
					`generate-json-schema snapshot changed: ${existingLock.schema?.generateJsonSchema?.snapshotHash} -> ${lock.schema.generateJsonSchema?.snapshotHash}`,
				);
			}
			if (existingLock.protocol?.whitelistHash !== lock.protocol.whitelistHash) {
				diffs.push(
					`whitelist changed: ${existingLock.protocol?.whitelistHash} -> ${lock.protocol.whitelistHash}`,
				);
			}
			if (!sameJson(existingLock.protocol?.requiredTypes, lock.protocol.requiredTypes)) {
				diffs.push('required payload type list changed');
			}
			if (
				existingLock.protocol?.shapeGuards?.sandboxPolicyWorkspaceWriteNetworkAccess !==
				lock.protocol.shapeGuards.sandboxPolicyWorkspaceWriteNetworkAccess
			) {
				diffs.push(
					`SandboxPolicy.workspaceWrite.networkAccess changed: ${existingLock.protocol?.shapeGuards?.sandboxPolicyWorkspaceWriteNetworkAccess} -> ${lock.protocol.shapeGuards.sandboxPolicyWorkspaceWriteNetworkAccess}`,
				);
			}
			if (
				existingLock.protocol?.runtimeSubset?.snapshotHash !==
				lock.protocol.runtimeSubset.snapshotHash
			) {
				diffs.push(
					`runtime protocol subset changed: ${existingLock.protocol?.runtimeSubset?.snapshotHash} -> ${lock.protocol.runtimeSubset.snapshotHash}`,
				);
			}
		}
		diffs.push(...errors);
	}

	const report = {
		exe,
		version,
		write: args.write,
		lockPath: LOCK_PATH,
		generateTs: lock.schema.generateTs,
		generateJsonSchema: lock.schema.generateJsonSchema,
		runtimeProtocol,
		shapeGuards,
		methodCounts,
		errors,
		diffs,
		ok: args.write ? errors.length === 0 : diffs.length === 0,
	};

	if (args.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(`easycode: ${version}`);
		console.log(`exe: ${exe}`);
		console.log(
			`generate-ts: ${lock.schema.generateTs.fileCount} files (v2 ${lock.schema.generateTs.v2FileCount}), hash ${lock.schema.generateTs.snapshotHash}`,
		);
		if (lock.schema.generateJsonSchema !== null) {
			console.log(
				`generate-json-schema: ${lock.schema.generateJsonSchema.fileCount} files, hash ${lock.schema.generateJsonSchema.snapshotHash}`,
			);
		}
		console.log(`whitelist: ${whitelistHash}`);
		console.log(
			`runtime protocol subset: ${runtimeProtocol.fileCount} files, hash ${runtimeProtocol.snapshotHash}`,
		);
		console.log(
			`shape guard SandboxPolicy.workspaceWrite.networkAccess: ${String(lock.protocol.shapeGuards.sandboxPolicyWorkspaceWriteNetworkAccess)}`,
		);
		if (args.write) console.log(`wrote ${LOCK_PATH}`);
		for (const diff of diffs) console.log(`DIFF ${diff}`);
		for (const error of errors) console.log(`ERROR ${error}`);
		console.log(report.ok ? 'OK' : 'FAILED');
	}
	if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
	console.error(`schema-diff failed: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
});
