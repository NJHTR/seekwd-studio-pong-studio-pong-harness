/**
 * `initialize` request and response.
 * Source: easyCode `app-server-protocol/schema/typescript/{InitializeParams,InitializeResponse,InitializeCapabilities,ClientInfo}.ts`.
 */

export interface ClientInfo {
	name: string;
	title?: string | null;
	version: string;
}

export interface InitializeCapabilities {
	/** Opt into experimental API methods and fields. */
	experimentalApi: boolean;
	requestAttestation?: boolean;
	explicitGatewayOauth?: boolean;
	optOutNotificationMethods?: string[] | null;
}

export interface InitializeParams {
	clientInfo: ClientInfo;
	capabilities: InitializeCapabilities | null;
}

export interface InitializeResponse {
	userAgent: string;
	/** Absolute path to the easyCode home directory. */
	easycodeHome: string;
	platformFamily: string;
	platformOs: string;
}
