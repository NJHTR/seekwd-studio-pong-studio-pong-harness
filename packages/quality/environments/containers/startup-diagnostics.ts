import type { PONGStartupDiagnostics } from './services/pong';

// Module-global because the playwright `pongContainer` worker fixture re-throws
// when `createPONGStack` fails, so dependent fixtures only see `pongContainer ===
// undefined` and have no fixture-graph path to the captured diagnostics. Scoped
// per worker — playwright workers are separate processes.
let latestStartupFailure: {
	projectName: string;
	diagnostics: PONGStartupDiagnostics;
	message: string;
	failurePhase?: string;
} | null = null;

export function recordStartupFailure(
	projectName: string,
	diagnostics: PONGStartupDiagnostics,
	message: string,
	failurePhase?: string,
): void {
	latestStartupFailure = { projectName, diagnostics, message, failurePhase };
}

export function consumeStartupFailure(): {
	projectName: string;
	diagnostics: PONGStartupDiagnostics;
	message: string;
	failurePhase?: string;
} | null {
	const failure = latestStartupFailure;
	latestStartupFailure = null;
	return failure;
}
