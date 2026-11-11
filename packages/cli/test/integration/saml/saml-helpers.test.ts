import { getPersonalProject, testDb } from '@pong/backend-test-utils';

import * as helpers from '@/modules/sso-saml/saml-helpers';
import type { SamlUserAttributes } from '@/modules/sso-saml/types';

beforeAll(async () => {
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('sso/saml/samlHelpers', () => {
	describe('createUserFromSamlAttributes', () => {
		test('Creates personal project for user', async () => {
			//
			// ARRANGE
			//
			const samlUserAttributes: SamlUserAttributes = {
				firstName: 'Nathan',
				lastName: 'Nathaniel',
				email: 'nathan@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
				userPrincipalName: 'Huh?',
				pongInstanceRole: 'pong_instance_role',
			};

			//
			// ACT
			//
			const user = await helpers.createUserFromSamlAttributes(samlUserAttributes);

			//
			// ASSERT
			//
			expect(user).toMatchObject({
				firstName: samlUserAttributes.firstName,
				lastName: samlUserAttributes.lastName,
				email: samlUserAttributes.email,
			});
			await expect(getPersonalProject(user)).resolves.not.toBeNull();
		});
	});
});
