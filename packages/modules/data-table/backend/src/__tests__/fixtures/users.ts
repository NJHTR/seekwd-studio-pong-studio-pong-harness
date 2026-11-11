import { randomEmail, randomName } from '@pong/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, UserRepository, type User } from '@pong/db';
import { Container } from '@pong/di';
import type { DeepPartial } from '@pong/typeorm';

export async function createUser(attributes: DeepPartial<User> = {}): Promise<User> {
	const repository = Container.get(UserRepository);
	const { user } = await repository.createUserWithProject(
		repository.create({
			email: randomEmail(),
			firstName: randomName(),
			lastName: randomName(),
			role: GLOBAL_MEMBER_ROLE,
			...attributes,
		}),
	);
	return user;
}
