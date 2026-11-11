import type { PromotionGitHostType } from '@pong/api-types';
import { Service } from '@pong/di';

import type { GitHostClient } from './git-host.types';
import { GitLabHostClient } from './gitlab-host.client';

@Service()
export class GitHostClients {
	private readonly clients: Record<PromotionGitHostType, GitHostClient>;

	constructor(gitlab: GitLabHostClient) {
		this.clients = { gitlab };
	}

	clientFor(type: PromotionGitHostType): GitHostClient {
		return this.clients[type];
	}
}
