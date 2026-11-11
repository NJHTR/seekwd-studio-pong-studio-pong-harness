import { GlobalConfig } from '@pong/config';
import { Service } from '@pong/di';

@Service()
export class UrlService {
	/** Returns the base URL pong is reachable from */
	readonly baseUrl: string;

	constructor(private readonly globalConfig: GlobalConfig) {
		this.baseUrl = this.generateBaseUrl();
	}

	/** Returns the base URL of the production webhooks */
	getWebhookBaseUrl() {
		// PONG_WEBHOOK_URL (config `webhookUrl`, already normalized by @pong/config) is the successor to the
		// deprecated WEBHOOK_URL; we prefer it when set. Only the legacy env var still needs quote trimming.
		let base =
			this.globalConfig.webhookUrl || this.trimQuotes(process.env.WEBHOOK_URL) || this.baseUrl;
		if (!base.endsWith('/')) base += '/';
		return base;
	}

	getTestWebhookBaseUrl() {
		let base = this.globalConfig.webhookUrl || this.getInstanceBaseUrl();
		if (!base.endsWith('/')) base += '/';
		return base;
	}

	/** Return the pong instance base URL without trailing slash */
	getInstanceBaseUrl(): string {
		const pongBaseUrl = this.trimQuotes(this.globalConfig.editorBaseUrl) || this.getWebhookBaseUrl();

		return pongBaseUrl.endsWith('/') ? pongBaseUrl.slice(0, pongBaseUrl.length - 1) : pongBaseUrl;
	}

	/** Returns the absolute URL of this instance's JWKS endpoint. */
	getInstanceJwksUri(): string {
		return `${this.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}/.well-known/jwks.json`;
	}

	private generateBaseUrl(): string {
		const { path, port, host, protocol } = this.globalConfig;

		if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
			return `${protocol}://${host}${path}`;
		}
		return `${protocol}://${host}:${port}${path}`;
	}

	/** Remove leading and trailing double quotes from a URL. */
	private trimQuotes(url?: string) {
		return url?.replace(/^["]+|["]+$/g, '') ?? '';
	}
}
