import type { ICredentialContext } from 'pong-workflow';

/**
 * Resolves the pong user an established identity carrier represents, best-effort.
 * Owned by the dynamic-credentials module; the redaction layer reads it through
 * {@link ExecutingUserIdentifierProxy} to attribute a run to its executing user.
 */
export interface IExecutingUserIdentifier {
	/** The user the carrier represents, or undefined when it maps to no pong user. */
	identify(context: ICredentialContext): Promise<string | undefined>;
}
