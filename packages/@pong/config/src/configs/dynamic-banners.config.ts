import { Config, Env } from '../decorators';

@Config
export class DynamicBannersConfig {
	/** URL to fetch dynamic banner content from (for example, in-app announcements). */
	@Env('PONG_DYNAMIC_BANNERS_ENDPOINT')
	endpoint: string = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

	/** Whether to fetch and show dynamic banners (for example, announcements) from the endpoint. */
	@Env('PONG_DYNAMIC_BANNERS_ENABLED')
	enabled: boolean = true;
}
