import type {
	WhatsAppCredentialCheck,
	WhatsAppMetaStatus,
	WhatsAppWebhookStatus,
} from '@pong/api-types';
import type { IRestApiContext } from '@pong/rest-api-client';
import { makeRestApiRequest } from '@pong/rest-api-client';

const integrationPath = (projectId: string, agentId: string) =>
	`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/integrations/whatsapp`;

export const checkWhatsAppCredential = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
): Promise<WhatsAppCredentialCheck> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/check/${encodeURIComponent(credentialId)}`,
	);

export const getWhatsAppWebhookStatus = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<WhatsAppWebhookStatus> =>
	await makeRestApiRequest(context, 'GET', `${integrationPath(projectId, agentId)}/webhook-status`);

/** Forgets an earlier handshake, so only one that happens after this confirms the step. */
export const resetWhatsAppWebhookStatus = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<WhatsAppWebhookStatus> =>
	await makeRestApiRequest(
		context,
		'DELETE',
		`${integrationPath(projectId, agentId)}/webhook-status`,
	);

export const getWhatsAppMetaStatus = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
): Promise<WhatsAppMetaStatus> =>
	await makeRestApiRequest(
		context,
		'GET',
		`${integrationPath(projectId, agentId)}/meta-status/${encodeURIComponent(credentialId)}`,
	);
