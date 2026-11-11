import get from 'lodash/get';
import type { IAuthenticateRuleResponseSuccessBody } from 'pong-workflow';

import { PongApi } from '../PongApi.credentials';

describe('PongApi Credential', () => {
	const [rule] = new PongApi().test.rules as IAuthenticateRuleResponseSuccessBody[];

	// The credentials tester fails the test when `get(body, key) === value`
	const fails = (body: unknown) => get(body, rule.properties.key) === rule.properties.value;

	it('should fail when the Base URL returns the editor UI page', () => {
		expect(fails('<!DOCTYPE html><html></html>')).toBe(true);
	});

	it('should pass when the Base URL returns the credential schema', () => {
		expect(fails({ additionalProperties: false, type: 'object', properties: {} })).toBe(false);
	});
});
