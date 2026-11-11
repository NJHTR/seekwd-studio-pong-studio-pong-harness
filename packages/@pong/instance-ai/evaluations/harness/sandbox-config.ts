// ---------------------------------------------------------------------------
// Sandbox config resolution for evaluations.
//
// Reads the same env vars production reads (PONG_INSTANCE_AI_SANDBOX_*,
// DAYTONA_*, PONG_SANDBOX_SERVICE_*) and produces a SandboxConfig the
// in-process eval harness can use to create the shared builder workspace.
//
// The sandbox is always on for evals — there is no opt-out. Missing
// required env vars raise clear errors so misconfiguration shows up at
// startup, not mid-run.
// ---------------------------------------------------------------------------

import type { SandboxConfig, SandboxProvider } from '../../src/workspace/create-workspace';

const DEFAULT_TIMEOUT_MS = 300_000;
/**
 * Default cold-build window for Daytona's first sandbox provisioning. The
 * image runs `npm install @pong/workflow-sdk` which routinely takes longer
 * than the SDK's 300s default; 900s avoids spurious eval-run failures.
 */
const DEFAULT_DAYTONA_CREATE_TIMEOUT_SECONDS = 900;
const VALID_PROVIDERS: SandboxProvider[] = ['pong-sandbox', 'daytona'];

export function resolveSandboxConfig(env: NodeJS.ProcessEnv): SandboxConfig {
	const providerRaw = env.PONG_INSTANCE_AI_SANDBOX_PROVIDER ?? 'pong-sandbox';
	if (!VALID_PROVIDERS.includes(providerRaw as SandboxProvider)) {
		throw new Error(
			`Invalid sandbox provider "${providerRaw}". Set PONG_INSTANCE_AI_SANDBOX_PROVIDER to one of: ${VALID_PROVIDERS.join(', ')}.`,
		);
	}
	const provider = providerRaw as SandboxProvider;
	const timeout = parseTimeout(env.PONG_INSTANCE_AI_SANDBOX_TIMEOUT) ?? DEFAULT_TIMEOUT_MS;

	if (provider === 'daytona') {
		const daytonaApiUrl = env.DAYTONA_API_URL;
		const daytonaApiKey = env.DAYTONA_API_KEY;
		if (!daytonaApiUrl) {
			throw new Error(
				'DAYTONA_API_URL is required for sandbox provider "daytona". Set it to e.g. https://app.daytona.io/api.',
			);
		}
		if (!daytonaApiKey) {
			throw new Error(
				'DAYTONA_API_KEY is required for sandbox provider "daytona". Set the Daytona API key.',
			);
		}
		const image = env.PONG_INSTANCE_AI_SANDBOX_IMAGE;
		const namePrefix = env.PONG_INSTANCE_AI_SANDBOX_NAME_PREFIX;
		const createTimeoutSeconds =
			parsePositiveInt(
				env.PONG_INSTANCE_AI_SANDBOX_CREATE_TIMEOUT_SECONDS,
				'PONG_INSTANCE_AI_SANDBOX_CREATE_TIMEOUT_SECONDS',
			) ?? DEFAULT_DAYTONA_CREATE_TIMEOUT_SECONDS;
		return {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl,
			daytonaApiKey,
			timeout,
			createTimeoutSeconds,
			...(image ? { image } : {}),
			...(namePrefix ? { namePrefix } : {}),
		};
	}

	if (provider === 'pong-sandbox') {
		const serviceUrl = env.PONG_SANDBOX_SERVICE_URL;
		if (!serviceUrl) {
			throw new Error(
				'PONG_SANDBOX_SERVICE_URL is required for sandbox provider "pong-sandbox". Set it to the service URL.',
			);
		}
		const apiKey = env.PONG_SANDBOX_SERVICE_API_KEY;
		return {
			enabled: true,
			provider: 'pong-sandbox',
			serviceUrl,
			...(apiKey ? { apiKey } : {}),
			timeout,
		};
	}

	const exhaustiveProvider: never = provider;
	throw new Error(
		`Invalid sandbox provider "${String(exhaustiveProvider)}". Set PONG_INSTANCE_AI_SANDBOX_PROVIDER to one of: ${VALID_PROVIDERS.join(', ')}.`,
	);
}

function parseTimeout(raw: string | undefined): number | undefined {
	if (raw === undefined || raw === '') return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) {
		throw new Error(
			`PONG_INSTANCE_AI_SANDBOX_TIMEOUT must be a positive number of ms, got "${raw}".`,
		);
	}
	return n;
}

function parsePositiveInt(raw: string | undefined, varName: string): number | undefined {
	if (raw === undefined || raw === '') return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
		throw new Error(`${varName} must be a positive integer, got "${raw}".`);
	}
	return n;
}
