import { UserError } from '@pong/errors';

export class AgentTurnAlreadyRunningError extends UserError {
	constructor() {
		super('A turn is already running in this conversation.');
	}
}
