import type { CredentialProvider, FetchFn, ResolvedCredential } from '@pong/agents';

/**
 * A `CredentialProvider` that can also mint the pong Connect (AI Gateway)
 * synthetic credential for a model slot, keyed by the model's provider prefix
 * (e.g. `openai`). `AgentsCredentialProvider` implements this; keeping the
 * capability on the provider avoids threading a resolver through the build path.
 */
export interface AiGatewayModelCredentialResolver {
	resolveAiGatewayModelCredential(provider: string): Promise<ResolvedCredential>;
	/** Create a model `fetch` that keeps the minted AI Gateway token current. */
	createAiGatewayTokenRefreshFetch(baseFetch: FetchFn): FetchFn;
}

export type AgentCredentialProvider = CredentialProvider &
	Partial<AiGatewayModelCredentialResolver>;
