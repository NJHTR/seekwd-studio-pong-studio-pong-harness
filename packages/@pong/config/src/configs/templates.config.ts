import { Config, Env } from '../decorators';

@Config
export class TemplatesConfig {
	/** Whether to enable loading and showing workflow templates. */
	@Env('PONG_TEMPLATES_ENABLED')
	enabled: boolean = true;

	/** Base URL for the workflow templates API. */
	@Env('PONG_TEMPLATES_HOST')
	host: string = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
}
