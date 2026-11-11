import { UserError } from '@pong/errors';

/**
 * Thrown when a public CRUD caller attempts to create, PATCH, or DELETE a row
 * of the system-managed PONG self-connect resolver type. The controller maps
 * this to a 400 BadRequest.
 */
export class SystemResolverModificationError extends UserError {
	constructor(action: 'create' | 'update' | 'delete') {
		super(`Cannot ${action} the system credential resolver.`);
	}
}
