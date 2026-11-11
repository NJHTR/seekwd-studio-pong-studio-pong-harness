import { Config, Env, Nested } from '../decorators';

@Config
class PostHogConfig {
	/** PostHog project API key for product analytics. */
	@Env('PONG_DIAGNOSTICS_POSTHOG_API_KEY')
	apiKey: string = 'phc_kMstNfAgBcBkWSh6KdsgN09heqqNe5VNmalHP1Ni9Q4';

	/** PostHog API host URL. */
	@Env('PONG_DIAGNOSTICS_POSTHOG_API_HOST')
	apiHost: string = 'https://ph.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
}

@Config
export class DiagnosticsConfig {
	/** Whether anonymous diagnostics and telemetry are enabled for this instance. */
	@Env('PONG_DIAGNOSTICS_ENABLED')
	enabled: boolean = true;

	/** Telemetry endpoint config for the frontend (format: key;baseUrl). */
	@Env('PONG_DIAGNOSTICS_CONFIG_FRONTEND')
	frontendConfig: string = '1zPn9bgWPzlQc0p8Gj1uiK6DOTn;https://telemetry.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

	/** Telemetry endpoint config for the backend (format: key;baseUrl). */
	@Env('PONG_DIAGNOSTICS_CONFIG_BACKEND')
	backendConfig: string = '1zPn7YoGC3ZXE9zLeTKLuQCB4F6;https://telemetry.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

	@Nested
	posthogConfig: PostHogConfig;
}
