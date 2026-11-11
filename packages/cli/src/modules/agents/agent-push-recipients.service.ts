import { UserRepository } from '@pong/db';
import { Service } from '@pong/di';

import { RoleService } from '@pong/backend-services';

@Service()
export class AgentPushRecipientsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly roleService: RoleService,
	) {}

	async getProjectReaders(projectId: string): Promise<string[]> {
		return await this.getProjectUsersWithScope(projectId, 'agent:read');
	}

	async getProjectUsersWithScope(
		projectId: string,
		scope: 'agent:read' | 'agent:execute',
	): Promise<string[]> {
		const [globalRoleSlugs, projectRoleSlugs] = await Promise.all([
			this.roleService.rolesWithScope('global', [scope]),
			this.roleService.rolesWithScope('project', [scope]),
		]);
		return await this.userRepository.findIdsWithGlobalOrProjectRoles({
			projectIds: [projectId],
			projectRoleSlugs,
			globalRoleSlugs,
		});
	}
}
