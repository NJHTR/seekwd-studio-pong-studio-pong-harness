import type { Fixtures, TestInfo } from '@playwright/test';
import type { PONGStartupDiagnostics } from 'pong-containers';
import { consumeStartupFailure } from 'pong-containers';
import type { PONGStack } from 'pong-containers/stack';

export type ObservabilityTestFixtures = {
	autoAttachLogs: undefined;
};

export type ObservabilityWorkerFixtures = {
	pongContainer: PONGStack;
};

/**
 * `stack.services` is a Proxy whose factory throws when a service isn't in the
 * project config (e.g. sqlite:e2e has no observability services). Optional
 * chaining doesn't help — the throw happens inside the factory invocation.
 */
function tryGetObservability(stack: PONGStack | undefined) {
	if (!stack) return undefined;
	try {
		return stack.services?.observability;
	} catch {
		return undefined;
	}
}

const STARTUP_PROFILE_TAG = '@startup-profile';

function shouldAlwaysAttachStartup(testInfo: TestInfo): boolean {
	if (process.env.CONTAINER_TELEMETRY_VERBOSE === '1') return true;
	return testInfo.tags.includes(STARTUP_PROFILE_TAG);
}

function formatStartupLogs(diagnostics: PONGStartupDiagnostics): string {
	const entries = Object.entries(diagnostics.logs).sort(([a], [b]) => a.localeCompare(b));
	if (entries.length === 0) return '';
	return entries.map(([name, body]) => `=== ${name} ===\n${body}`).join('\n\n');
}

function formatReadinessPayloads(diagnostics: PONGStartupDiagnostics): string {
	const entries = Object.entries(diagnostics.readinessPayloads).sort(([a], [b]) =>
		a.localeCompare(b),
	);
	if (entries.length === 0) return '';
	return entries
		.map(
			([name, body]) =>
				`=== ${name} ===\n${body ?? '(no /healthz/readiness response observed before timeout)'}`,
		)
		.join('\n\n');
}

async function attachStartupDiagnostics(
	diagnostics: PONGStartupDiagnostics,
	testInfo: TestInfo,
	failurePhase?: string,
): Promise<void> {
	if (diagnostics.attemptId) {
		await testInfo.attach('startup-attempt.json', {
			body: JSON.stringify(
				{
					attemptId: diagnostics.attemptId,
					failurePhase: failurePhase ?? null,
					testRetry: testInfo.retry,
					workerIndex: testInfo.workerIndex,
					parallelIndex: testInfo.parallelIndex,
					status: testInfo.status,
				},
				null,
				2,
			),
			contentType: 'application/json',
		});
	}

	const startupLogs = formatStartupLogs(diagnostics);
	if (startupLogs) {
		await testInfo.attach('pong-startup-logs.txt', {
			body: startupLogs,
			contentType: 'text/plain',
		});
	}

	const readinessPayloads = formatReadinessPayloads(diagnostics);
	if (readinessPayloads) {
		await testInfo.attach('pong-readiness-payload.txt', {
			body: readinessPayloads,
			contentType: 'text/plain',
		});
	}
}

async function attachLogsOnFailure(
	stack: PONGStack,
	testInfo: TestInfo,
	options: { lookbackMinutes?: number } = {},
): Promise<void> {
	const obs = tryGetObservability(stack);
	if (!obs) return;

	const lookback = options.lookbackMinutes ?? 5;

	try {
		const logs = await obs.logs.query('*', {
			limit: 10000,
			start: `${lookback}m`,
		});

		if (logs.length === 0) return;

		const groupedLogs = logs.reduce<Record<string, typeof logs>>((acc, log) => {
			const container = log.container_name ?? 'unknown';
			acc[container] ??= [];
			acc[container].push(log);
			return acc;
		}, {});

		for (const containerLogs of Object.values(groupedLogs)) {
			containerLogs.sort((a, b) => (a._time ?? '').localeCompare(b._time ?? ''));
		}

		const formattedLogs = Object.entries(groupedLogs)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([container, containerLogs]) => {
				const logLines = containerLogs.map((log) => `[${log._time}] ${log.message}`).join('\n');
				return `=== ${container} ===\n${logLines}`;
			})
			.join('\n\n');

		await testInfo.attach('container-logs', {
			body: formattedLogs,
			contentType: 'text/plain',
		});

		const jsonLinesExport = logs.map((log) => JSON.stringify(log)).join('\n');
		await testInfo.attach('victoria-logs-export.jsonl', {
			body: jsonLinesExport,
			contentType: 'application/x-ndjson',
		});
	} catch (error) {
		console.warn('Failed to collect container logs:', error);
	}
}

async function attachMetricsOnFailure(stack: PONGStack, testInfo: TestInfo): Promise<void> {
	const obs = tryGetObservability(stack);
	if (!obs) return;

	try {
		const metricsExport = await obs.metrics.exportAll();

		if (!metricsExport.trim()) return;

		await testInfo.attach('victoria-metrics-export.jsonl', {
			body: metricsExport,
			contentType: 'application/x-ndjson',
		});
	} catch (error) {
		console.warn('Failed to export metrics:', error);
	}
}

/**
 * Auto-attaches container logs and metrics on test failure.
 * Import exports locally with scripts/import-victoria-data.mjs
 */
export const observabilityFixtures: Fixtures<
	ObservabilityTestFixtures,
	ObservabilityWorkerFixtures
> = {
	autoAttachLogs: [
		async ({ pongContainer }, use, testInfo) => {
			await use(undefined);

			const isFailure = testInfo.status !== testInfo.expectedStatus;
			const alwaysAttach = shouldAlwaysAttachStartup(testInfo);

			// pongContainer is undefined when createPONGStack threw before returning,
			// so observability/metrics aren't queryable. Drain whatever diagnostics
			// the container service stashed before re-throwing.
			if (!pongContainer) {
				if (!isFailure) return;
				const failure = consumeStartupFailure();
				if (!failure) return;
				try {
					await attachStartupDiagnostics(failure.diagnostics, testInfo, failure.failurePhase);
				} catch (error) {
					console.warn('Failed to attach pong startup diagnostics:', error);
				}
				return;
			}

			if (alwaysAttach) {
				try {
					await attachStartupDiagnostics(pongContainer.startupDiagnostics, testInfo);
				} catch (error) {
					console.warn('Failed to attach pong startup diagnostics:', error);
				}
			}

			if (!isFailure) return;
			if (!tryGetObservability(pongContainer)) return;

			await Promise.all([
				attachLogsOnFailure(pongContainer, testInfo),
				attachMetricsOnFailure(pongContainer, testInfo),
			]);
		},
		{ auto: true },
	],
};
