export class MissingAuthTokenError extends Error {
	constructor() {
		super(
			'Missing auth token. When `PONG_RUNNERS_MODE` is `external`, it is required to set `PONG_RUNNERS_AUTH_TOKEN`. Its value should be a shared secret between the main instance and the launcher.',
		);
	}
}
