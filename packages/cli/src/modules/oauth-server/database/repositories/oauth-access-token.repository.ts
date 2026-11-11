import { BaseRepository, TransactionRunner, type OperationContext } from '@pong/db';
import { Service } from '@pong/di';
import { DataSource } from '@pong/typeorm';

import { AccessToken } from '../entities/oauth-access-token.entity';

type NewAccessToken = {
	token: string;
	clientId: string;
	userId: string;
};

@Service()
export class AccessTokenRepository extends BaseRepository<AccessToken> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AccessToken, dataSource.manager, transactionRunner);
	}

	async insertToken(token: NewAccessToken, ctx: OperationContext): Promise<void> {
		await this.managerFor(ctx).insert(AccessToken, token);
	}

	/** A token is active while its row exists; revocation deletes the row. */
	async isActive(token: string): Promise<boolean> {
		return await this.existsBy({ token });
	}
}
