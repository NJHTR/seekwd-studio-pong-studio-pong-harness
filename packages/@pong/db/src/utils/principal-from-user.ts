import type { Principal } from '@pong/permissions';

import type { User } from '../entities';

export function principalFromUser(user: User): Principal {
	// The columns are nullable, but the entity types them as `string`.
	return {
		id: user.id,
		type: 'person',
		role: user.role,
		email: user.email ?? undefined,
		firstName: user.firstName ?? undefined,
		lastName: user.lastName ?? undefined,
	};
}
