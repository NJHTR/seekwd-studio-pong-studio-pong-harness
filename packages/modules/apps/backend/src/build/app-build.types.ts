import type { AppBuildResponse } from '@pong/api-types';

export type AppBuildAttempt = {
	attemptNumber: number;
	startedAt: Date;
};

export type AppBuildStage = NonNullable<AppBuildResponse['diagnostics']>['stage'];

export class AppBuildError extends Error {
	constructor(
		readonly stage: AppBuildStage,
		message: string,
		readonly log = '',
		readonly retryable = false,
	) {
		super(message);
	}
}
