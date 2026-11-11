import { randomEmail, randomName } from '@pong/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, UserRepository } from '@pong/db';
import { Container } from '@pong/di';

export async function createMember() {
	const { user } = await Container.get(UserRepository).createUserWithProject({
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
		password: null,
		role: GLOBAL_MEMBER_ROLE,
	});

	return user;
}
