/**
 * Constants and environment gates of the easyCode runtime of the Agents module.
 *
 * The runtime is one `SystemAgentProvider` (see `easycode-agent.provider.ts`),
 * so it reuses the `/agents/system` HTTP routes and the Agents tables. It is
 * opt-in: without `PONG_EASYCODE_RUNTIME=1` the provider is not registered.
 */

export const EASYCODE_AGENT_ID = 'easycode';
export const EASYCODE_AGENT_NAME = 'easyCode';

/** The value of `agent_execution_threads.runtimeKind` for an easyCode thread. */
export const EASYCODE_RUNTIME_KIND = 'easycode';

/** The default of `agent_execution_threads.runtimeKind`: the in-process pong runtime. */
export const LOCAL_RUNTIME_KIND = 'local';

export const EASYCODE_ENABLE_ENV = 'PONG_EASYCODE_RUNTIME';
export const EASYCODE_BIN_ENV = 'PONG_EASYCODE_BIN';
export const EASYCODE_CWD_ENV = 'PONG_EASYCODE_CWD';
export const EASYCODE_MODEL_ENV = 'PONG_EASYCODE_MODEL';
export const EASYCODE_HOME_ENV = 'PONG_EASYCODE_HOME';

/** A turn interrupt that takes longer than this is treated as ended (ADR-02/M0). */
export const EASYCODE_CLOSE_TIMEOUT_MS = 5_000;

/** True when the instance opts in to the easyCode runtime. */
export function isEasycodeRuntimeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
	const value = env[EASYCODE_ENABLE_ENV];
	return value === '1' || value === 'true';
}

/** The working directory of the easyCode turns: the project checkout of the instance. */
export function resolveEasycodeWorkingDirectory(env: NodeJS.ProcessEnv = process.env): string {
	const configured = env[EASYCODE_CWD_ENV];
	return configured !== undefined && configured.trim() !== '' ? configured : process.cwd();
}

/** The model id passed to `thread/start`. Absent means the easyCode default. */
export function resolveEasycodeModel(env: NodeJS.ProcessEnv = process.env): string | undefined {
	const configured = env[EASYCODE_MODEL_ENV];
	return configured !== undefined && configured.trim() !== '' ? configured : undefined;
}
