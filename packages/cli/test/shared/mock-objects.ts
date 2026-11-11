import {
	randomCredentialPayload,
	randomEmail,
	randomName,
	uniqueId,
} from '@pong/backend-test-utils';
import { CredentialsEntity, Project, ServiceAccount, ServiceAccountDetails, User } from '@pong/db';
import { randomInt } from 'pong-workflow';

export const mockCredential = (): CredentialsEntity =>
	Object.assign(new CredentialsEntity(), randomCredentialPayload());

export const mockUser = (): User =>
	Object.assign(new User(), {
		id: randomInt(1000),
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
	});

/** A service account with its details loaded, as every `find*` query returns it. */
export const mockServiceAccount = (
	attributes: Partial<ServiceAccount> = {},
	name = 'Deploy bot',
): ServiceAccount =>
	Object.assign(new ServiceAccount(), {
		id: uniqueId(),
		details: Object.assign(new ServiceAccountDetails(), { name }),
		...attributes,
	});

export const mockProject = (): Project =>
	Object.assign(new Project(), {
		id: uniqueId(),
		type: 'personal',
		name: 'Nathan Fillion <nathan.fillion@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness>',
	});
