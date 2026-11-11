import { DaytonaSandbox } from './daytona-sandbox';
import { PongSandboxServiceSandbox } from './pong-sandbox-sandbox';
import type {
	CreateSandboxOptions,
	SandboxConfig,
	SandboxFilesystem,
	SandboxInstance,
} from './types';
import type { BaseFilesystemOptions } from '../filesystem/base-filesystem';
import { DaytonaFilesystem } from '../filesystem/daytona-filesystem';
import { PongSandboxFilesystem } from '../filesystem/pong-sandbox-filesystem';

export async function createSandbox(
	config: SandboxConfig,
	options: CreateSandboxOptions = {},
): Promise<SandboxInstance | undefined> {
	return await Promise.resolve(buildSandbox(config, options));
}

function buildSandbox(
	config: SandboxConfig,
	options: CreateSandboxOptions = {},
): SandboxInstance | undefined {
	if (!config.enabled) return undefined;

	const provider = config.provider;

	if (provider === 'daytona') {
		const mode = config.getAuthToken ? 'proxy' : 'direct';
		const logger = options.logger ?? config.logger;
		return new DaytonaSandbox({
			id: config.id,
			name: config.name,
			apiKey: config.getAuthToken ? undefined : config.daytonaApiKey,
			getAuthToken: config.getAuthToken,
			refreshSkewMs: config.refreshSkewMs,
			logger,
			apiUrl: config.daytonaApiUrl,
			labels: config.labels,
			...(config.ephemeral !== undefined ? { ephemeral: config.ephemeral } : {}),
			...(config.autoStopInterval !== undefined
				? { autoStopInterval: config.autoStopInterval }
				: {}),
			...(config.autoArchiveInterval !== undefined
				? { autoArchiveInterval: config.autoArchiveInterval }
				: {}),
			...(config.autoDeleteInterval !== undefined
				? { autoDeleteInterval: config.autoDeleteInterval }
				: {}),
			...(config.image ? { image: config.image } : {}),
			...(config.snapshot ? { snapshot: config.snapshot } : {}),
			language: 'typescript',
			timeout: config.timeout ?? 300_000,
			createTimeoutSeconds: config.createTimeoutSeconds ?? 300,
			errorReporter: options.errorReporter,
			createStrategyMode: mode,
		});
	}

	if (provider === 'pong-sandbox') {
		return new PongSandboxServiceSandbox({
			id: config.id,
			...(config.ephemeral !== undefined ? { ephemeral: config.ephemeral } : {}),
			apiKey: config.apiKey,
			serviceUrl: config.serviceUrl,
			timeout: config.timeout ?? 300_000,
		});
	}

	const exhaustiveProvider: never = provider;
	throw new Error(`Unsupported sandbox provider: ${String(exhaustiveProvider)}`);
}

export function createFilesystem(sandbox: undefined, options?: BaseFilesystemOptions): undefined;
export function createFilesystem(
	sandbox: SandboxInstance,
	options?: BaseFilesystemOptions,
): SandboxFilesystem;
export function createFilesystem(
	sandbox: SandboxInstance | undefined,
	options?: BaseFilesystemOptions,
): SandboxFilesystem | undefined {
	if (!sandbox) return undefined;

	if (sandbox instanceof PongSandboxServiceSandbox) {
		return new PongSandboxFilesystem(sandbox, options);
	}

	if (sandbox instanceof DaytonaSandbox) {
		return new DaytonaFilesystem(sandbox, options);
	}

	throw new Error(`Unsupported sandbox instance: ${sandbox.name}`);
}
