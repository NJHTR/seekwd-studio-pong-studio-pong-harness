import type { ListDataTableQueryDto } from '@pong/api-types';
import { Logger } from '@pong/backend-common';
import { ProjectRelationRepository, User } from '@pong/db';
import { Service } from '@pong/di';
import { hasGlobalScope } from '@pong/permissions';

import { RoleService } from '@pong/backend-services';

import { DataTableRepository } from './data-table.repository';

@Service()
export class DataTableAggregateService {
	constructor(
		private readonly dataTableRepository: DataTableRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly roleService: RoleService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('data-table');
	}
	async start() {}
	async shutdown() {}

	async getManyAndCount(user: User, options: ListDataTableQueryDto) {
		if (hasGlobalScope(user, 'dataTable:listProject')) {
			return await this.dataTableRepository.getManyAndCount(options);
		}

		const roles = await this.roleService.rolesWithScope('project', ['dataTable:listProject']);
		let projectIds = await this.projectRelationRepository.getAccessibleProjectsByRoles(
			user.id,
			roles,
		);

		if (options.filter?.projectId) {
			const mask = [options.filter?.projectId].flat();
			projectIds = projectIds.filter((x) => mask.includes(x));
		}

		if (projectIds.length === 0) {
			return { count: 0, data: [] };
		}

		return await this.dataTableRepository.getManyAndCount({
			...options,
			filter: {
				...options.filter,
				projectId: projectIds,
			},
		});
	}
}
