import { UserError } from 'pong-workflow';

export class WorkerMissingEncryptionKey extends UserError {
	constructor() {
		super(
			[
				'Failed to start worker because of missing encryption key.',
				'Please set the `PONG_ENCRYPTION_KEY` env var when starting the worker.',
				'See: https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			].join(' '),
		);
	}
}
