import { EventService } from '@pong/backend-services';
import { GlobalConfig } from '@pong/config';
import { type Person, PersonRepository, User } from '@pong/db';
import type { IPasswordAuthHandler } from '@pong/decorators';
import { AuthHandler } from '@pong/decorators';
import { Constructable } from '@pong/di';

import { AuthError } from '@pong/errors';
import { PasswordUtility } from '@/services/password.utility';

@AuthHandler()
export class EmailAuthHandler implements IPasswordAuthHandler<User> {
	readonly metadata = { name: 'email', type: 'password' as const };
	readonly userClass: Constructable<User> = User;

	constructor(
		private readonly personRepository: PersonRepository,
		private readonly passwordUtility: PasswordUtility,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
	) {}

	async handleLogin(email: string, password: string): Promise<Person | undefined> {
		const person = await this.personRepository.findByEmailWithAuthIdentities(email);

		if (person?.password && (await this.passwordUtility.compare(password, person.password))) {
			return person;
		}

		// At this point if the user has a LDAP ID, means it was previously an LDAP user,
		// so suggest to reset the password to gain access to the instance.
		const ldapIdentity = person?.authIdentities?.find((i) => i.providerType === 'ldap');
		if (person && ldapIdentity && !this.globalConfig.sso.ldap.loginEnabled) {
			this.eventService.emit('login-failed-due-to-ldap-disabled', { userId: person.id });

			throw new AuthError('Reset your password to gain access to the instance.');
		}

		return undefined;
	}
}
