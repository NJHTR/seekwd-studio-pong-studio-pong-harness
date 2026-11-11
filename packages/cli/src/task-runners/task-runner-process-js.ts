import { Logger } from '@pong/backend-common';
import { TaskRunnersConfig } from '@pong/config';
import { Service } from '@pong/di';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as process from 'node:process';

import { NodeProcessOomDetector } from './node-process-oom-detector';
import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';
import { ChildProcess, ExitReason, TaskRunnerProcessBase } from './task-runner-process-base';

/**
 * Responsible for managing a JavaScript task runner as a child process.
 * This is for internal mode, which is NOT recommended for production.
 */
@Service()
export class JsTaskRunnerProcess extends TaskRunnerProcessBase {
	protected readonly name = 'runner:js';

	private oomDetector: NodeProcessOomDetector | null = null;

	constructor(
		logger: Logger,
		runnerConfig: TaskRunnersConfig,
		authService: TaskBrokerAuthService,
		runnerLifecycleEvents: TaskRunnerLifecycleEvents,
	) {
		super('task-runner-js', logger, runnerConfig, authService, runnerLifecycleEvents);

		assert(this.isInternal, `${this.constructor.name} cannot be used in external mode`);
	}

	startProcess(grantToken: string, taskBrokerUri: string, runnerId: string): ChildProcess {
		const startScript = require.resolve('@pong/task-runner/start');
		const flags = this.runnerConfig.insecureMode
			? []
			: [
					'--disallow-code-generation-from-strings',
					'--disable-proto=delete',
					'--no-experimental-webstorage',
				];

		return spawn('node', [...flags, startScript], {
			env: this.getProcessEnvVars(grantToken, taskBrokerUri, runnerId),
		});
	}

	setupProcessMonitoring(process: ChildProcess) {
		this.oomDetector = new NodeProcessOomDetector(process);
	}

	analyzeExitReason(): { reason: ExitReason } {
		return { reason: this.oomDetector?.didProcessOom ? 'oom' : 'unknown' };
	}

	private getProcessEnvVars(grantToken: string, taskBrokerUri: string, runnerId: string) {
		const envVars: Record<string, string | undefined> = Object.assign(Object.create(null), {
			// system environment
			PATH: process.env.PATH,
			HOME: process.env.HOME ?? process.env.USERPROFILE,
			NODE_PATH: process.env.NODE_PATH,

			// pong
			GENERIC_TIMEZONE: process.env.GENERIC_TIMEZONE,
			NODE_FUNCTION_ALLOW_BUILTIN: process.env.NODE_FUNCTION_ALLOW_BUILTIN,
			NODE_FUNCTION_ALLOW_EXTERNAL: process.env.NODE_FUNCTION_ALLOW_EXTERNAL,

			// sentry
			PONG_SENTRY_DSN: process.env.PONG_SENTRY_DSN,
			PONG_VERSION: process.env.PONG_VERSION,
			ENVIRONMENT: process.env.ENVIRONMENT,
			DEPLOYMENT_NAME: process.env.DEPLOYMENT_NAME,

			// runner
			PONG_RUNNERS_ID: runnerId,
			PONG_RUNNERS_GRANT_TOKEN: grantToken,
			PONG_RUNNERS_TASK_BROKER_URI: taskBrokerUri,
			PONG_RUNNERS_MAX_PAYLOAD: this.runnerConfig.maxPayload.toString(),
			PONG_RUNNERS_MAX_CONCURRENCY: this.runnerConfig.maxConcurrency.toString(),
			PONG_RUNNERS_TASK_TIMEOUT: this.runnerConfig.taskTimeout.toString(),
			PONG_RUNNERS_HEARTBEAT_INTERVAL: this.runnerConfig.heartbeatInterval.toString(),
			PONG_RUNNERS_INSECURE_MODE: process.env.PONG_RUNNERS_INSECURE_MODE,
			// Forwarded so the internal runner's graceful-shutdown grace can be coordinated
			// with pong's (otherwise it falls back to the runner's own default).
			PONG_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT: process.env.PONG_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT,
			PONG_RUNNERS_SHUTDOWN_FORCE_KILL_MARGIN: process.env.PONG_RUNNERS_SHUTDOWN_FORCE_KILL_MARGIN,
		});

		if (this.runnerConfig.maxOldSpaceSize) {
			envVars.NODE_OPTIONS = `--max-old-space-size=${this.runnerConfig.maxOldSpaceSize}`;
		}

		return envVars;
	}
}
