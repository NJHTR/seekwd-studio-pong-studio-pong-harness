import { Container } from '@pong/di';
import { FavoriteResourceResolverRegistry } from '@pong/backend-services';

import { AgentRepository } from './repositories/agent.repository';

export function registerFavoriteResolver() {
	const agentRepository = Container.get(AgentRepository);
	Container.get(FavoriteResourceResolverRegistry).register('agent', {
		globalReadScope: 'agent:read',
		findMeta: async (ids) =>
			new Map(
				(await agentRepository.findSummariesByIds(ids)).map(({ id, name, projectId }) => [
					id,
					{ name, projectId },
				]),
			),
		// Instance agents have no project, so they cannot be favorites.
		exists: async (id) => (await agentRepository.getProjectIdById(id)) !== null,
	});
}
