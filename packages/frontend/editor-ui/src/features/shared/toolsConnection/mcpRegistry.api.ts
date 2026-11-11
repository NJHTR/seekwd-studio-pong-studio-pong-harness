import type {
	McpRegistryDiscoveryRequest,
	McpRegistryDiscoveryResponse,
	McpRegistryServerResponse,
} from '@pong/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@pong/rest-api-client';

export async function fetchMcpRegistryCatalog(
	context: IRestApiContext,
): Promise<McpRegistryServerResponse[]> {
	return await makeRestApiRequest(context, 'GET', '/mcp-registry/servers');
}

export async function discoverMcpConnection(
	context: IRestApiContext,
	request: McpRegistryDiscoveryRequest,
): Promise<McpRegistryDiscoveryResponse> {
	return await makeRestApiRequest(context, 'POST', '/mcp-registry/discover', request);
}
