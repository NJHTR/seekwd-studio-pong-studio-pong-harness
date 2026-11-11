import { Logger } from '@pong/backend-common';
import { Service } from '@pong/di';
import { DataSource, In, Repository } from '@pong/typeorm';

import { Scope } from '../entities';

@Service()
export class ScopeRepository extends Repository<Scope> {
	constructor(
		dataSource: DataSource,
		private readonly logger: Logger,
	) {
		super(Scope, dataSource.manager);
	}

	async findByList(slugs: string[]) {
		return await this.findBy({ slug: In(slugs) });
	}

	async findByListOrFail(slugs: string[]) {
		const uniqueSlugs = new Set(slugs);
		const scopes = await this.findBy({ slug: In([...uniqueSlugs]) });
		if (scopes.length !== uniqueSlugs.size) {
			const foundSlugSet = new Set(
				scopes.map((s) => s.slug).filter((slug): slug is Scope['slug'] => typeof slug === 'string'),
			);
			const invalidScopesSet = new Set(uniqueSlugs);
			for (const slug of foundSlugSet) {
				invalidScopesSet.delete(slug);
			}
			const message = `The following scopes are invalid: ${[...invalidScopesSet].join(', ')}`;
			this.logger.error(message);
			throw new Error(message);
		}
		return scopes;
	}
}
