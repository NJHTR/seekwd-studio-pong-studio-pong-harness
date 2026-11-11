import { DateTimeColumn } from '@pong/db';
import { Entity, PrimaryColumn } from '@pong/typeorm';

@Entity('token_exchange_jti')
export class TokenExchangeJti {
	@PrimaryColumn({ type: 'varchar', length: 255 })
	jti: string;

	@DateTimeColumn()
	expiresAt: Date;

	@DateTimeColumn()
	createdAt: Date;
}
