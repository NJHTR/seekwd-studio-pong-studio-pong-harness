/**
 * Extract port from a URL string
 */
export function getPortFromUrl(url: string): string {
	const parsedUrl = new URL(url);
	return parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
}

/**
 * Get the backend URL from environment variables
 * Returns PONG_BASE_URL
 */
export function getBackendUrl(): string | undefined {
	return process.env.PONG_BASE_URL;
}

/**
 * Get the frontend URL from environment variables
 * When PONG_EDITOR_URL is set (dev mode), use it for the frontend
 * Otherwise, use the same URL as the backend
 */
export function getFrontendUrl(): string | undefined {
	return process.env.PONG_EDITOR_URL ?? process.env.PONG_BASE_URL;
}

/**
 * Build the readiness URL of a backend.
 * The backend serves readiness at `<PONG_ENDPOINT_HEALTH>/readiness` and adds a
 * missing leading slash to that variable, so mirror both rules here.
 */
export function getReadinessUrl(baseUrl: string, healthEndpoint?: string): string {
	const health = healthEndpoint ?? '/healthz';
	const healthPath = health.startsWith('/') ? health : `/${health}`;
	return `${baseUrl.replace(/\/+$/, '')}${healthPath}/readiness`;
}
