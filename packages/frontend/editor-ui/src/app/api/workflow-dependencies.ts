import type { IRestApiContext } from '@pong/rest-api-client';
import type {
	DependenciesBatchResponse,
	DependencyCountsBatchResponse,
	DependencyResourceType,
	ResolvedDependency,
} from '@pong/api-types';
import { makeRestApiRequest } from '@pong/rest-api-client';

export async function getResourceDependencyCounts(
	context: IRestApiContext,
	resourceIds: string[],
	resourceType: DependencyResourceType,
) {
	return await makeRestApiRequest<DependencyCountsBatchResponse>(
		context,
		'POST',
		'/workflow-dependencies/counts',
		{ resourceIds, resourceType },
	);
}

export async function getResourceDependencies(
	context: IRestApiContext,
	resourceIds: string[],
	resourceType: DependencyResourceType,
) {
	return await makeRestApiRequest<DependenciesBatchResponse>(
		context,
		'POST',
		'/workflow-dependencies/details',
		{ resourceIds, resourceType },
	);
}

export async function getFolderDependencies(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
) {
	return await makeRestApiRequest<ResolvedDependency[]>(
		context,
		'GET',
		`/workflow-dependencies/projects/${projectId}/folders/${folderId}`,
	);
}
