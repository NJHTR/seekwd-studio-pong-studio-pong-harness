import { WorkflowRepository } from '@pong/db';
import {
	type AuthenticatedRequest,
	type CredentialsEntity,
	type Folder,
	type Project,
	type WorkflowEntity,
	type WorkflowTagMapping,
} from '@pong/db';
import { Service } from '@pong/di';
import { hasGlobalScope } from '@pong/permissions';
import type { FindOptionsWhere } from '@pong/typeorm';

import { ForbiddenError } from '@pong/errors';
import type { DataTable } from '@pong/backend-module-data-table';

import { SourceControlContextFactory } from './source-control-context.factory';
import { SourceControlContext } from './types/source-control-context';

@Service()
export class SourceControlScopedService {
	constructor(
		private readonly sourceControlContextFactory: SourceControlContextFactory,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async ensureIsAllowedToPush(req: AuthenticatedRequest) {
		if (hasGlobalScope(req.user, 'sourceControl:push')) {
			return;
		}

		const ctx = await this.sourceControlContextFactory.createContext(req.user);

		if (ctx.authorizedProjects.length === 0) {
			throw new ForbiddenError('You are not allowed to push changes');
		}
	}

	async ensureIsAllowedToGetStatus(req: AuthenticatedRequest) {
		if (
			hasGlobalScope(req.user, ['sourceControl:pull', 'sourceControl:push', 'sourceControl:manage'])
		) {
			return;
		}

		const ctx = await this.sourceControlContextFactory.createContext(req.user);

		if (ctx.authorizedProjects.length === 0) {
			throw new ForbiddenError('You do not have permission to read source control status');
		}
	}

	async getWorkflowsInAdminProjectsFromContext(
		context: SourceControlContext,
		id?: string,
	): Promise<WorkflowEntity[] | undefined> {
		if (context.hasAccessToAllProjects()) {
			return;
		}

		// For single-id lookups, query directly
		if (id) {
			const where = this.getWorkflowsInAdminProjectsFromContextFilter(context);
			where.id = id;
			return await this.workflowRepository.find({ select: { id: true }, where });
		}

		return context.accessibleWorkflowIds.map((wfId) => ({ id: wfId }) as WorkflowEntity);
	}

	getProjectsWithPushScopeByContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<Project> | undefined {
		if (context.hasAccessToAllProjects()) {
			return;
		}

		return {
			type: 'team',
			projectRelations: {
				role: {
					scopes: {
						slug: 'sourceControl:push',
					},
				},
				userId: context.user.id,
			},
		};
	}

	getFoldersInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<Folder> {
		if (context.hasAccessToAllProjects()) {
			return {};
		}

		return {
			homeProject: this.getProjectsWithPushScopeByContextFilter(context),
		};
	}

	getWorkflowsInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<WorkflowEntity> {
		if (context.hasAccessToAllProjects()) {
			return {};
		}

		return {
			shared: {
				role: 'workflow:owner',
				project: this.getProjectsWithPushScopeByContextFilter(context),
			},
		};
	}

	getCredentialsInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<CredentialsEntity> {
		if (context.hasAccessToAllProjects()) {
			// Instance credentials (provider connections) are instance-local and never synced
			return { usageScope: 'project' };
		}

		return {
			shared: {
				role: 'credential:owner',
				project: this.getProjectsWithPushScopeByContextFilter(context),
			},
		};
	}

	getWorkflowTagMappingInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<WorkflowTagMapping> {
		if (context.hasAccessToAllProjects()) {
			return {};
		}

		return {
			workflows: this.getWorkflowsInAdminProjectsFromContextFilter(context),
		};
	}

	getDataTablesInAdminProjectsFromContextFilter(
		context: SourceControlContext,
	): FindOptionsWhere<DataTable> {
		if (context.hasAccessToAllProjects()) {
			return {};
		}

		return {
			project: this.getProjectsWithPushScopeByContextFilter(context),
		};
	}
}
