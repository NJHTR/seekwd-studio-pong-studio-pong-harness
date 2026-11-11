import { Service } from '@pong/di';
import type { ErrorEvent, Exception } from '@sentry/core';
import { ErrorReporter } from 'pong-core';

import { SentryConfig } from './config/sentry-config';

/**
 * Sentry service for the task runner.
 */
@Service()
export class TaskRunnerSentry {
	constructor(
		private readonly config: SentryConfig,
		private readonly errorReporter: ErrorReporter,
	) {}

	async initIfEnabled() {
		const { dsn, pongVersion, environment, deploymentName, profilingEnabled, tracesSampleRate } =
			this.config;

		if (!dsn) return;

		await this.errorReporter.init({
			serverType: 'task_runner',
			dsn,
			release: `pong@${pongVersion}`,
			environment,
			serverName: deploymentName,
			beforeSendFilter: this.filterOutUserCodeErrors,
			withEventLoopBlockDetection: false,
			tracesSampleRate,
			profilingEnabled,
			eligibleIntegrations: {
				Http: true,
			},
		});
	}

	async shutdown() {
		if (!this.config.dsn) return;

		await this.errorReporter.shutdown();
	}

	/**
	 * Filter out errors originating from user provided code.
	 * It is possible for users to create code that causes unhandledrejections
	 * that end up in the sentry error reporting.
	 */
	filterOutUserCodeErrors = (event: ErrorEvent) => {
		const error = event?.exception?.values?.[0];

		return error ? this.isUserCodeError(error) : false;
	};

	/**
	 * Check if the error is originating from user provided code.
	 * It is possible for users to create code that causes unhandledrejections
	 * that end up in the sentry error reporting.
	 */
	private isUserCodeError(error: Exception) {
		if (
			error.type === 'EvalError' &&
			error.value === 'Code generation from strings disallowed for this context' // from --disallow-code-generation-from-strings
		) {
			return true;
		}

		const frames = error.stacktrace?.frames;
		if (!frames) return false;

		return frames.some((frame) => {
			if (frame.filename === 'node:vm' && frame.function === 'runInContext') {
				return true;
			}

			if (frame.filename === 'evalmachine.<anonymous>') {
				return true;
			}

			if (frame.function === 'VmCodeWrapper') {
				return true;
			}

			return false;
		});
	}
}
