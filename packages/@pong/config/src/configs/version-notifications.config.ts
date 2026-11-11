import { Config, Env } from '../decorators';

@Config
export class VersionNotificationsConfig {
	/** Whether to check for and show in-app notifications about new pong versions. */
	@Env('PONG_VERSION_NOTIFICATIONS_ENABLED')
	enabled: boolean = true;

	/** URL used to fetch current pong version information. */
	@Env('PONG_VERSION_NOTIFICATIONS_ENDPOINT')
	endpoint: string = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

	/** Whether to fetch and show "What's New" content. Requires version notifications to be enabled. */
	@Env('PONG_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED')
	whatsNewEnabled: boolean = true;

	/** URL used to fetch "What's New" articles. */
	@Env('PONG_VERSION_NOTIFICATIONS_WHATS_NEW_ENDPOINT')
	whatsNewEndpoint: string = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

	/** URL linked from the versions panel (for example, upgrade instructions). */
	@Env('PONG_VERSION_NOTIFICATIONS_INFO_URL')
	infoUrl: string = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
}
