import { Config, Env } from '../decorators';

@Config
export class HiringBannerConfig {
	/** Whether to show the hiring/recruitment message in the browser devtools console. */
	@Env('PONG_HIRING_BANNER_ENABLED')
	enabled: boolean = true;
}
