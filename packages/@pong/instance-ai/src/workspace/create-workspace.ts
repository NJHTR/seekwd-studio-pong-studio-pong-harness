import { Workspace } from '@pong/agents';
import {
	createFilesystem,
	createSandbox as createSharedSandbox,
	type CreateSandboxOptions,
	type DaytonaSandboxConfig,
	type DisabledSandboxConfig,
	type PongSandboxConfig,
	type SandboxConfig as SharedSandboxConfig,
	type SandboxInstance,
	type SandboxProvider,
} from '@pong/agents/sandbox';
import { randomUUID } from 'node:crypto';

import type { Logger } from '../logger';
import type { BuilderTemplatesService } from './builder-templates-service';
import { SnapshotManager } from './snapshot-manager';

export type InstanceAiDaytonaSandboxConfig = DaytonaSandboxConfig & {
	/** Running pong version, used to resolve a versioned prebuilt snapshot. */
	pongVersion?: string;
	/** Prefix prepended to the Daytona sandbox name and surfaced as a label. */
	namePrefix?: string;
};

export type InstanceAiSandboxConfig =
	| DisabledSandboxConfig
	| InstanceAiDaytonaSandboxConfig
	| PongSandboxConfig;

export type SandboxConfig = InstanceAiSandboxConfig;
export { type SandboxInstance, type SandboxProvider };

export type InstanceAiCreateSandboxOptions = CreateSandboxOptions &
	(
		| { useSnapshotFallback?: false }
		| { useSnapshotFallback: true; templatesService: BuilderTemplatesService }
	);

const NOOP_LOGGER: Logger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};
const INSTANCE_AI_SANDBOX_ID_LABEL = 'pong-instance-ai-sandbox-id';

function createSandboxId(): string {
	return `daytona-sandbox-${randomUUID()}`;
}

function toSharedDaytonaSandboxConfig(
	config: InstanceAiDaytonaSandboxConfig,
): DaytonaSandboxConfig {
	const id = config.id ?? createSandboxId();
	const sharedConfig = {
		...config,
		id,
		labels: {
			...config.labels,
			[INSTANCE_AI_SANDBOX_ID_LABEL]: id,
		},
	};
	delete sharedConfig.pongVersion;
	delete sharedConfig.namePrefix;
	delete sharedConfig.snapshot;
	return sharedConfig;
}

function toSharedSandboxConfig(config: InstanceAiSandboxConfig): SharedSandboxConfig {
	if (!config.enabled || config.provider !== 'daytona') return config;
	return toSharedDaytonaSandboxConfig(config);
}

/**
 * Create a sandbox instance based on config.
 * Returns undefined when sandbox is disabled.
 *
 * - 'daytona': Isolated Docker container via Daytona API.
 * - 'pong-sandbox': pong sandbox service-backed container.
 */
export async function createSandbox(
	config: InstanceAiSandboxConfig,
	options: InstanceAiCreateSandboxOptions = {},
): Promise<SandboxInstance | undefined> {
	if (!config.enabled) return undefined;

	if (config.provider !== 'daytona' || options.useSnapshotFallback !== true) {
		return await createSharedSandbox(toSharedSandboxConfig(config), {
			logger: options.logger,
			errorReporter: options.errorReporter,
		});
	}

	const logger = options.logger ?? config.logger ?? NOOP_LOGGER;
	const snapshotManager = new SnapshotManager(
		typeof config.image === 'string' ? config.image : undefined,
		logger,
		config.pongVersion,
		options.templatesService,
	);

	const isProxyMode = config.getAuthToken !== undefined;
	// An explicit snapshot name (e.g. from PONG_INSTANCE_AI_SANDBOX_SNAPSHOT) overrides the
	// version-derived default.
	const snapshot = isProxyMode
		? (config.snapshot ?? snapshotManager.snapshotName() ?? undefined)
		: undefined;
	logger.debug('Resolved Daytona sandbox snapshot', {
		snapshot: snapshot ?? '(none — building from image)',
		source: config.snapshot ? 'override' : isProxyMode ? 'pong-version' : 'image-only',
	});

	// The sandbox proxy can't serve image-build context uploads, so proxy mode is snapshot-only.
	if (isProxyMode) {
		if (!snapshot) {
			const error = new Error(
				`No Instance AI sandbox snapshot is available for this pong version (${config.pongVersion ?? 'unknown'}) and sandbox images cannot be built through the sandbox proxy`,
			);
			// Error-level on purpose: every proxied build for this version is down until fixed.
			options.errorReporter?.error(error, { tags: { component: 'instance-ai-snapshot' } });
			throw error;
		}
		const sharedConfig = toSharedDaytonaSandboxConfig(config);
		delete sharedConfig.image;
		try {
			return await createSharedSandbox(
				{
					...sharedConfig,
					snapshot,
				},
				{
					logger: options.logger,
					errorReporter: options.errorReporter,
				},
			);
		} catch (error) {
			// Error-level on purpose: every proxied build for this version is down until fixed.
			options.errorReporter?.error(
				new Error(`Instance AI sandbox snapshot "${snapshot}" is missing or unusable`, {
					cause: error,
				}),
				{ tags: { component: 'instance-ai-snapshot' } },
			);
			throw error;
		}
	}

	const image = await snapshotManager.ensureImage();

	return await createSharedSandbox(
		{
			...toSharedDaytonaSandboxConfig(config),
			image,
		},
		{
			logger: options.logger,
			errorReporter: options.errorReporter,
		},
	);
}

/**
 * Create a Workspace wrapping a sandbox instance.
 */
export function createWorkspace(sandbox: SandboxInstance | undefined): Workspace | undefined {
	if (!sandbox) return undefined;

	const filesystem = createFilesystem(sandbox);

	return new Workspace({
		sandbox,
		filesystem,
	});
}
