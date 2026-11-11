import { CredentialsEntity, User, WithTimestamps } from '@pong/db';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from '@pong/typeorm';

import { DynamicCredentialResolver } from './credential-resolver';

/**
 * Stores user-specific dynamic credential data resolved by a credential resolver.
 */
@Entity({
	name: 'dynamic_credential_user_entry',
})
export class DynamicCredentialUserEntry extends WithTimestamps {
	constructor() {
		super();
	}

	@PrimaryColumn({
		name: 'credentialId',
	})
	credentialId: string;

	@PrimaryColumn({
		name: 'userId',
	})
	userId: string;

	@PrimaryColumn({
		name: 'resolverId',
	})
	resolverId: string;

	@Column('text')
	data: string;

	@ManyToOne(() => CredentialsEntity, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'credentialId' })
	credential: CredentialsEntity;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User;

	@ManyToOne(() => DynamicCredentialResolver, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'resolverId' })
	resolver: DynamicCredentialResolver;
}
