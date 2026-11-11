import type {
	FolderTransferResult,
	TransferWorkflowBodyDto,
	WorkflowTransferResult,
} from '@pong/api-types';
import type { IShareWorkflowsPayload, IWorkflowsShareResponse } from '@/Interface';
import type { IRestApiContext } from '@pong/rest-api-client';
import { makeRestApiRequest } from '@pong/rest-api-client';
import type { IDataObject } from 'pong-workflow';

export async function setWorkflowSharedWith(
	context: IRestApiContext,
	id: string,
	data: IShareWorkflowsPayload,
): Promise<IWorkflowsShareResponse> {
	return await makeRestApiRequest(
		context,
		'PUT',
		`/workflows/${id}/share`,
		data as unknown as IDataObject,
	);
}

export async function moveWorkflowToProject(
	context: IRestApiContext,
	id: string,
	body: TransferWorkflowBodyDto,
): Promise<WorkflowTransferResult | undefined> {
	return await makeRestApiRequest(context, 'PUT', `/workflows/${id}/transfer`, body);
}

export async function moveFolderToProject(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
	destinationProjectId: string,
	destinationParentFolderId?: string,
	shareCredentials?: string[],
): Promise<FolderTransferResult> {
	return await makeRestApiRequest(
		context,
		'PUT',
		`/projects/${projectId}/folders/${folderId}/transfer`,
		{
			destinationProjectId,
			destinationParentFolderId: destinationParentFolderId ?? '0',
			shareCredentials,
		},
	);
}
