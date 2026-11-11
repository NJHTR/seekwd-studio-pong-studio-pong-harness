import { Logger } from '@pong/backend-common';
import { TaskRunnersConfig } from '@pong/config';
import { Service } from '@pong/di';
import { exec, spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { TaskBrokerAuthService } from './task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from './task-runner-lifecycle-events';
import { TaskRunnerProcessBase } from './task-runner-process-base';

const asyncExec = promisify(exec);

/**
 * Responsible for managing a Python task runner as a child process.
 * This is for internal mode, which is NOT recommended for production.
 */
@Service()
export class PyTaskRunnerProcess extends TaskRunnerProcessBase {
	protected readonly name = 'runner:py';

	constructor(
		logger: Logger,
		runnerConfig: TaskRunnersConfig,
		authService: TaskBrokerAuthService,
		runnerLifecycleEvents: TaskRunnerLifecycleEvents,
	) {
		super('task-runner-py', logger, runnerConfig, authService, runnerLifecycleEvents);
	}

	startProcess(grantToken: string, taskBrokerUri: string, runnerId: string) {
		const pythonDir = path.join(__dirname, '../../../@pong/task-runner-python');
		const venvPath = PyTaskRunnerProcess.getVenvPath();

		return spawn(venvPath, ['-m', 'src.main'], {
			cwd: pythonDir,
			env: Object.assign(Object.create(null), {
				// system environment
				PATH: process.env.PATH,
				HOME: process.env.HOME ?? process.env.USERPROFILE,

				// runner
				PONG_RUNNERS_ID: runnerId,
				PONG_RUNNERS_GRANT_TOKEN: grantToken,
				PONG_RUNNERS_TASK_BROKER_URI: taskBrokerUri,
				PONG_RUNNERS_MAX_PAYLOAD: this.runnerConfig.maxPayload.toString(),
				PONG_RUNNERS_MAX_CONCURRENCY: this.runnerConfig.maxConcurrency.toString(),
				PONG_RUNNERS_TASK_TIMEOUT: this.runnerConfig.taskTimeout.toString(),
				PONG_RUNNERS_HEARTBEAT_INTERVAL: this.runnerConfig.heartbeatInterval.toString(),

				// pong
				PONG_RUNNERS_STDLIB_ALLOW: process.env.PONG_RUNNERS_STDLIB_ALLOW,
				PONG_RUNNERS_EXTERNAL_ALLOW: process.env.PONG_RUNNERS_EXTERNAL_ALLOW,
				PONG_RUNNERS_ALLOW_TRANSITIVE_IMPORTS: process.env.PONG_RUNNERS_ALLOW_TRANSITIVE_IMPORTS,
				PONG_RUNNERS_BUILTINS_DENY: process.env.PONG_RUNNERS_BUILTINS_DENY,
				PONG_BLOCK_RUNNER_ENV_ACCESS: process.env.PONG_BLOCK_RUNNER_ENV_ACCESS,
			}),
		});
	}

	/**
	 * Check if Python requirements are met for internal mode.
	 * Returns the failure reason if requirements are missing, or `null` if all requirements are met.
	 */
	static async checkRequirements(): Promise<'python' | 'venv' | null> {
		try {
			if (process.platform === 'win32') {
				const { stdout, stderr } = await asyncExec('python --version', { timeout: 5000 });
				// Python 2 prints version to stderr, Python 3 to stdout
				const output = (stdout + stderr).trim();
				if (!output.startsWith('Python 3')) {
					return 'python';
				}
			} else {
				await asyncExec('python3 --version', { timeout: 5000 });
			}
		} catch {
			return 'python';
		}

		try {
			await access(PyTaskRunnerProcess.getVenvPath());
		} catch {
			return 'venv';
		}

		return null;
	}

	/** Public so tests can decide synchronously whether the runner can be started. */
	static getVenvPath() {
		const pythonDir = path.join(__dirname, '../../../@pong/task-runner-python');
		const isWindows = process.platform === 'win32';
		const venvBin = isWindows ? 'Scripts' : 'bin';
		const pythonExe = isWindows ? 'python.exe' : 'python';
		return path.join(pythonDir, '.venv', venvBin, pythonExe);
	}
}
