import { Config, Nested } from '@pong/config';

import { BaseRunnerConfig } from './base-runner-config';
import { JsRunnerConfig } from './js-runner-config';
import { SentryConfig } from './sentry-config';

@Config
export class MainConfig {
	@Nested
	baseRunnerConfig!: BaseRunnerConfig;

	@Nested
	jsRunnerConfig!: JsRunnerConfig;

	@Nested
	sentryConfig!: SentryConfig;
}
