import { Config, Env } from '../decorators';

@Config
export class PersonalizationConfig {
	/** Whether to enable personalization features. */
	@Env('PONG_PERSONALIZATION_ENABLED')
	enabled: boolean = true;
}
