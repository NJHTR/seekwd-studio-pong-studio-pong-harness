import { appendFileSync, readFileSync } from 'node:fs';

import { RestClient } from './api';
import type { CycleContext } from './harness';
import { fail, ok, step } from './harness';
import { PONGStartupError } from 'pong-containers/services/pong';
import { createPONGStack } from 'pong-containers/stack';

/** Env every phase shares; the rotation flag is the only per-phase change. */
const CYCLE_ENV: Record<string, string> = {
	HOME: '/home/node',
	PONG_LOG_LEVEL: 'info',
	PONG_RUNNERS_ENABLED: 'false',
	PONG_RUNNERS_MODE: 'internal',
	PONG_VERSION_NOTIFICATIONS_ENABLED: 'false',
	PONG_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false',
};

const flagEnv = (rotationFlag: boolean): Record<string, string> => ({
	PONG_ENV_FEAT_ENCRYPTION_KEY_ROTATION: rotationFlag ? 'true' : 'false',
});

const hostUser = () => `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;

export interface PhaseInstance {
	image: string;
	rotationFlag: boolean;
	label: string;
}

/**
 * Boots the backend's stack — the database service plus the first pong image —
 * over the context's persistent home dir. The container runs as the host user
 * so the mounted files stay host-owned: later phases boot a different image on
 * the same data, and the sqlite assertions read the file directly.
 */
export async function bootStack(ctx: CycleContext, options: PhaseInstance): Promise<RestClient> {
	const { image, rotationFlag, label } = options;
	step(ctx, `starting ${label} (${image}, rotation flag: ${rotationFlag ? 'on' : 'off'})`);
	try {
		ctx.stack = await createPONGStack({
			postgres: ctx.backend === 'postgres',
			projectName: `enc-${ctx.mode}-${ctx.backend}-${process.pid}`,
			env: { ...CYCLE_ENV, ...flagEnv(rotationFlag) },
			image,
			userHomeHostDir: ctx.homeDir,
			user: hostUser(),
			// An old release migrating a fresh database can exceed the default 60s.
			startupTimeoutMs: 180_000,
		});
	} catch (error) {
		return bootFailure(ctx, label, error);
	}
	ok(ctx, `instance is ready (${ctx.stack.baseUrl})`);
	return new RestClient(ctx, ctx.stack.baseUrl);
}

/**
 * Swaps the running pong main for the requested image on the live stack
 * (`stack.replacePONG`): the database, network, user folder, and host port
 * stay. Collects the outgoing container's logs first.
 */
export async function swapInstance(ctx: CycleContext, options: PhaseInstance): Promise<RestClient> {
	const { image, rotationFlag, label } = options;
	const stack = requireStack(ctx);
	await collectCurrentLogs(ctx);
	step(ctx, `swapping to ${label} (${image}, rotation flag: ${rotationFlag ? 'on' : 'off'})`);
	try {
		await stack.replacePONG({ image, env: flagEnv(rotationFlag) });
	} catch (error) {
		return bootFailure(ctx, label, error);
	}
	ok(ctx, `instance is ready (${stack.baseUrl})`);
	return new RestClient(ctx, stack.baseUrl);
}

/** Collects the current main's logs and tears the whole stack down. */
export async function finishCycle(ctx: CycleContext): Promise<void> {
	if (!ctx.stack) return;
	step(ctx, `stopping the stack (logs in ${ctx.logFile})`);
	await collectCurrentLogs(ctx);
	await ctx.stack.stop();
	ctx.stack = undefined;
}

function requireStack(ctx: CycleContext) {
	if (!ctx.stack) return fail('the stack is not running');
	return ctx.stack;
}

function bootFailure(ctx: CycleContext, label: string, error: unknown): never {
	// Keep the boot log readable in the FAIL output: the startup diagnostics
	// land in the backend's pong.log, the FAIL block prints its tail.
	if (error instanceof PONGStartupError) {
		for (const logs of Object.values(error.diagnostics.logs)) {
			appendFileSync(ctx.logFile, logs);
		}
		const readiness = Object.values(error.diagnostics.readinessPayloads).at(-1);
		fail(`${label} did not become ready`, `last readiness payload: ${readiness ?? '(none)'}`);
	}
	throw error;
}

/** Appends the running main's docker logs to the backend's pong.log. */
export async function collectCurrentLogs(ctx: CycleContext): Promise<void> {
	const container = ctx.stack?.findContainers(/-pong$/)[0];
	if (!container) return;
	try {
		const stream = await container.logs();
		const chunks: Buffer[] = [];
		await new Promise<void>((resolve) => {
			stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
			stream.on('end', resolve);
			stream.on('error', () => resolve());
			// docker follows the log stream; a short settle window is enough for history.
			setTimeout(resolve, 2000);
		});
		appendFileSync(ctx.logFile, Buffer.concat(chunks).toString('utf8'));
	} catch {
		// logs are diagnostics only; never fail the cycle over them
	}
}

export async function readInstanceVersion(ctx: CycleContext): Promise<string> {
	const container = ctx.stack?.findContainers(/-pong$/)[0];
	if (!container) return '?';
	try {
		const result = await container.exec(['pong', '--version']);
		const lines = result.output.trim().split('\n');
		return lines[lines.length - 1] ?? '?';
	} catch {
		return '?';
	}
}

/** The last-40-lines tail the FAIL output prints. */
export function logTail(ctx: CycleContext): string {
	try {
		const lines = readFileSync(ctx.logFile, 'utf8').split('\n');
		return lines.slice(-40).join('\n');
	} catch {
		return '(no log file)';
	}
}
