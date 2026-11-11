import { Config, Env } from '../decorators';

@Config
export class ChatTriggerConfig {
	/** Whether public chat should be disabled for Chat Trigger on this instance. */
	@Env('PONG_DISABLE_PUBLIC_CHAT_TRIGGER')
	disablePublicChat: boolean = false;
}
