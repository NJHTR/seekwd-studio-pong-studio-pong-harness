import { Logger } from '@pong/backend-common';
import { GlobalConfig } from '@pong/config';
import { Container } from '@pong/di';
import { getErrorMessage } from '@pong/utils/errors/get-error-message';
import { ErrorReporter, instanceTypeFromArgv } from 'pong-core';

import { PONG_RELEASE_DATE, PONG_VERSION } from '@/constants';
import { resolveBackendHealthEndpointPath } from '@/utils/health-endpoint.util';

export async function initErrorReporting(): Promise<void> {
	try {
		const globalConfig = Container.get(GlobalConfig);
		const {
			backendDsn,
			environment,
			deploymentName,
			profilingEnabled,
			tracesSampleRate,
			tracesSlowSpanThresholdMs,
			webhookTracesSampleRate,
			eventLoopBlockThreshold,
			eventLoopBlockMaxEventsPerHour,
			eventLoopBlockDetectionEnabled,
		} = globalConfig.sentry;

		await Container.get(ErrorReporter).init({
			serverType: instanceTypeFromArgv(process.argv),
			dsn: backendDsn,
			environment,
			release: `pong@${PONG_VERSION}`,
			serverName: deploymentName,
			releaseDate: PONG_RELEASE_DATE,
			withEventLoopBlockDetection: eventLoopBlockDetectionEnabled,
			eventLoopBlockThreshold,
			eventLoopBlockMaxEventsPerHour,
			tracesSampleRate,
			slowSpanThresholdMs: tracesSlowSpanThresholdMs,
			webhookEndpoint: globalConfig.endpoints.webhook,
			webhookTracesSampleRate,
			profilingEnabled,
			healthEndpoint: resolveBackendHealthEndpointPath(globalConfig),
			eligibleIntegrations: {
				Express: true,
				Http: true,
				Postgres: globalConfig.database.type === 'postgresdb',
				Redis: globalConfig.executions.mode === 'queue' || globalConfig.cache.backend === 'redis',
			},
		});
	} catch (error) {
		Container.get(Logger).error(
			'Failed to set up error reporting at startup, so pong sends no errors to Sentry',
			{
				error: getErrorMessage(error),
			},
		);
	}
}
