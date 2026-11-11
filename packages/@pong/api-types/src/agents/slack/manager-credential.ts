import type { SlackManagerCredentialSummary } from './types';

/** True when pong can use this Slack manager credential to create and install Slack apps. */
export function isSlackManagerCredentialReady(
	credential: Pick<SlackManagerCredentialSummary, 'connected' | 'reconnectRequired'>,
): boolean {
	return credential.connected && !credential.reconnectRequired;
}
