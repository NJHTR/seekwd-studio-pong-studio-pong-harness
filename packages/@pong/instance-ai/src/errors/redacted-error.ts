import type { IRedactedErrorInfo } from 'pong-workflow';

/**
 * Format an error that pong redacted for the viewer. Redaction keeps only the
 * error type and the HTTP status code, so the text says that details exist.
 */
export function formatRedactedError(error: IRedactedErrorInfo): string {
	// A refused run saves its error without a name, so the type can be missing.
	const type = error.type ? `${error.type} error` : 'Error';
	return `${type}${error.httpCode ? ` (${error.httpCode})` : ''} (details hidden by pong)`;
}
