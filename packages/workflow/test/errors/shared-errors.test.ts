import * as sharedErrors from '@pong/errors';

import * as workflowErrors from '../../src/errors';

describe('errors re-exported from @pong/errors', () => {
	it.each([
		'ApplicationError',
		'BaseError',
		'OperationalError',
		'UnexpectedError',
		'UserError',
	] as const)('should re-export the shared %s class', (name) => {
		expect(workflowErrors[name]).toBe(sharedErrors[name]);
	});
});
