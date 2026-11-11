import { Service } from '@pong/di';
import type { Inbound } from '@pong/inbound-auth';
import {
	UnexpectedError,
	type PongOAuth2FlowResult,
	type PongOAuth2RefreshResult,
} from 'pong-workflow';

/** What the surface knows of the callback request, carried into the verified result. */
export type OAuth2FlowRequest = Pick<Inbound['request'], 'method' | 'url' | 'ip'>;

/**
 * The redirect login of first-party trigger resources. `begin` and `complete` run the
 * authorization-code flow against a trusted source: the instance's own OAuth2 server
 * with a per-trigger virtual client, or an external issuer with a registered client.
 * `refresh` rotates the grant at the same source. A registered (DCR) client of the
 * internal server cannot use these methods — it goes through the public `/oauth/token`
 * endpoint instead.
 */
export interface PongOAuth2Flow {
	begin(resourceUrl: string, metadata?: Record<string, string>): Promise<string>;
	complete(code: string, state: string, request?: OAuth2FlowRequest): Promise<PongOAuth2FlowResult>;
	refresh(refreshToken: string, resourceUrl: string): Promise<PongOAuth2RefreshResult>;
}

@Service()
export class OAuth2FlowProxy implements PongOAuth2Flow {
	private provider: PongOAuth2Flow | null = null;

	registerProvider(provider: PongOAuth2Flow): void {
		this.provider = provider;
	}

	async begin(resourceUrl: string, metadata?: Record<string, string>): Promise<string> {
		if (!this.provider) throw new UnexpectedError('OAuth2 trigger flow is not available');
		return await this.provider.begin(resourceUrl, metadata);
	}

	async complete(
		code: string,
		state: string,
		request?: OAuth2FlowRequest,
	): Promise<PongOAuth2FlowResult> {
		if (!this.provider) throw new UnexpectedError('OAuth2 trigger flow is not available');
		return await this.provider.complete(code, state, request);
	}

	async refresh(refreshToken: string, resourceUrl: string): Promise<PongOAuth2RefreshResult> {
		if (!this.provider) throw new UnexpectedError('OAuth2 trigger flow is not available');
		return await this.provider.refresh(refreshToken, resourceUrl);
	}
}
