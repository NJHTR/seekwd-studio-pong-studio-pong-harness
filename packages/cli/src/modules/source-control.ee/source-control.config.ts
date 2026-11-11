import { Config, Env } from '@pong/config';

@Config
export class SourceControlConfig {
	/** Default SSH key type to use when generating SSH keys. */
	@Env('PONG_SOURCECONTROL_DEFAULT_SSH_KEY_TYPE')
	defaultKeyPairType: 'ed25519' | 'rsa' = 'ed25519';
}
