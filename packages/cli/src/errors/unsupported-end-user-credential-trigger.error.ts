import { UserError } from '@pong/errors';

const SYSTEM_RESOLVER_MESSAGE =
	"End-user credentials aren't supported by this workflow's trigger. Supported triggers: Manual, Sub-workflow, Chat available in pong Chat Hub or using pong user authentication in hosted chat mode, and MCP, Form, or Webhook with pong user authentication. To use another trigger, switch this credential to Fixed.";

const CUSTOM_RESOLVER_MESSAGE =
	'End-user credentials with this resolver need a trigger that extracts an identity. Configure an identity extractor on the trigger, or switch this credential to Fixed.';

export class UnsupportedEndUserCredentialTriggerError extends UserError {
	constructor(resolverType: 'system' | 'custom') {
		super(resolverType === 'system' ? SYSTEM_RESOLVER_MESSAGE : CUSTOM_RESOLVER_MESSAGE);
	}
}
