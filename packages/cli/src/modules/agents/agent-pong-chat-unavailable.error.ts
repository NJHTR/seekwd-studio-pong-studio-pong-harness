import { UserError } from '@pong/errors';

export class AgentPongChatUnavailableError extends UserError {
	constructor() {
		super('This agent is not available in pong Chat');
	}
}
