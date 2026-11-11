import { Config, Env } from '@pong/config';

@Config
export class PushConfig {
	/** Backend to use for push notifications */
	@Env('PONG_PUSH_BACKEND')
	backend: 'sse' | 'websocket' = 'websocket';
}
