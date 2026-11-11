import { UnexpectedError } from 'pong-workflow';

export class NonMethodError extends UnexpectedError {
	constructor(name: string) {
		super(`${name} must be a method on a class to use this decorator`);
	}
}
