import type { PolicyViolation } from '@pong/decorators';

import { deniedNodeTypes } from '../type-violation';

const violation: PolicyViolation = {
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: 'Node type "pong-nodes-base.dateTime" is blocked by an instance policy',
	subject: 'pong-nodes-base.dateTime',
	subjectType: 'nodeType',
};

describe('deniedNodeTypes', () => {
	it('keys the denied node types by the type they name', () => {
		expect(deniedNodeTypes({ violations: [violation] })).toEqual(
			new Map([['pong-nodes-base.dateTime', violation]]),
		);
	});

	it('keeps the first violation for a type that several rules deny', () => {
		const second = { ...violation, checkId: 'other-check' };

		expect(
			deniedNodeTypes({ violations: [violation, second] }).get('pong-nodes-base.dateTime'),
		).toBe(violation);
	});

	it.each([
		['another kind', { ...violation, kind: 'credential-type-unavailable' }],
		['another subject type', { ...violation, subjectType: 'credentialType' }],
		['no subject', { ...violation, subject: undefined }],
	])('ignores a violation with %s', (_label, ignored) => {
		expect(deniedNodeTypes({ violations: [ignored] }).size).toBe(0);
	});
});
