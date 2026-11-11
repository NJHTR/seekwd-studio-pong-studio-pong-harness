import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { REDACTED, redactedHeaders } from '../src/auth-redaction';
import type { IWebhookFunctions, PongOAuth2ValidationResult } from '../src/interfaces';
import type { PongOAuth2BrowserFlowMode } from '../src/pong-oauth2-auth';
import { pongOAuth2Auth, resolveOAuthClientMode } from '../src/pong-oauth2-auth';

const WEBHOOK_URL = 'https://pong.example.com/webhook/protected-path';
const USER = { id: 'u1', email: 'u@example.com', firstName: 'U', lastName: 'One' };

const AUTHORIZE_URL = 'https://pong.example.com/oauth/authorize?client_id=…&state=s1';

const buildContext = (opts: {
	authorization?: string;
	otherHeaders?: Record<string, string>;
	validation?: PongOAuth2ValidationResult;
	webhookUrl?: string | undefined;
	method?: string;
	originalUrl?: string;
	query?: Record<string, string>;
}) => {
	const response = mock<Response>();
	response.writeHead.mockReturnValue(response);
	response.end.mockReturnValue(response);
	response.status.mockReturnValue(response);
	response.send.mockReturnValue(response);
	response.cookie.mockReturnValue(response);
	response.clearCookie.mockReturnValue(response);

	const context = mock<IWebhookFunctions>();
	context.getWebhookResourceUrl.mockReturnValue(
		'webhookUrl' in opts ? opts.webhookUrl : WEBHOOK_URL,
	);
	context.getResponseObject.mockReturnValue(response);
	const request = {
		method: opts.method ?? 'GET',
		protocol: 'https',
		headers: {
			...(opts.authorization ? { authorization: opts.authorization } : {}),
			...opts.otherHeaders,
		} as Record<string, string>,
		query: opts.query ?? {},
		originalUrl: opts.originalUrl ?? '/webhook/protected-path',
	};
	context.getRequestObject.mockReturnValue(request as never);
	context.validatePongOAuth2Token.mockResolvedValue(opts.validation ?? { valid: true, user: USER });
	context.beginPongOAuth2Flow.mockResolvedValue(AUTHORIZE_URL);

	return { context, response, request, validatePongOAuth2Token: context.validatePongOAuth2Token };
};

describe('pongOAuth2Auth', () => {
	it('returns the token, resource and resolved user for a valid bearer token', async () => {
		const { context, validatePongOAuth2Token } = buildContext({
			authorization: 'Bearer good-token',
			validation: { valid: true, user: USER },
		});

		const result = await pongOAuth2Auth(context, { realm: 'pong Webhook' });

		expect(validatePongOAuth2Token).toHaveBeenCalledWith('good-token', WEBHOOK_URL);
		expect(result).toEqual({
			status: 'ok',
			token: 'good-token',
			resource: WEBHOOK_URL,
			user: USER,
		});
	});

	it('encodes the served method into the resource and the protected-resource metadata URL', async () => {
		const { context, validatePongOAuth2Token } = buildContext({
			authorization: 'Bearer good-token',
		});

		// mixed-case input is canonicalised to the upper-cased `method` selector
		const result = await pongOAuth2Auth(context, { realm: 'pong Webhook', method: 'post' });

		const expectedResource = `${WEBHOOK_URL}?method=POST`;
		expect(validatePongOAuth2Token).toHaveBeenCalledWith('good-token', expectedResource);
		expect(result).toEqual({
			status: 'ok',
			token: 'good-token',
			resource: expectedResource,
			user: USER,
		});
	});

	it('advertises the method-qualified metadata URL in WWW-Authenticate', async () => {
		const { context, response } = buildContext({});

		await pongOAuth2Auth(context, { realm: 'pong Webhook', method: 'GET' });

		expect(response.writeHead).toHaveBeenCalledWith(401, {
			'WWW-Authenticate': expect.stringContaining(
				'/.well-known/oauth-protected-resource/webhook/protected-path?method=GET',
			),
		});
	});

	it('responds 401 without WWW-Authenticate error when no bearer token is present', async () => {
		const { context, response, validatePongOAuth2Token } = buildContext({});

		const result = await pongOAuth2Auth(context, { realm: 'pong Webhook' });

		expect(result).toBe('handled');
		expect(validatePongOAuth2Token).not.toHaveBeenCalled();
		expect(response.writeHead).toHaveBeenCalledWith(401, {
			'WWW-Authenticate': expect.stringContaining('realm="pong Webhook"'),
		});
	});

	it.each([
		['invalid_token', 401],
		['insufficient_scope', 403],
	] as const)('answers a %s refusal with the challenge the host built', async (reason, code) => {
		const params = `resource_metadata="https://pong.example.com/.well-known/oauth-protected-resource/webhook/protected-path", error="${reason}", error_description="source-not-accepted"`;
		const { context, response } = buildContext({
			authorization: 'Bearer test-token',
			validation: { valid: false, reason, challenge: `Bearer ${params}` },
		});

		const result = await pongOAuth2Auth(context, { realm: 'pong Webhook' });

		expect(result).toBe('handled');
		// The realm is added, as on every other challenge from the trigger.
		expect(response.writeHead).toHaveBeenCalledWith(code, {
			'WWW-Authenticate': `Bearer realm="pong Webhook", ${params}`,
		});
	});

	// insufficient_scope → 403, invalid_token → 401; both carry the reason in WWW-Authenticate.
	it.each([
		['insufficient_scope', 403],
		['invalid_token', 401],
	] as const)('maps a %s validation failure to a %i response', async (reason, code) => {
		const { context, response } = buildContext({
			authorization: 'Bearer test-token',
			validation: { valid: false, reason },
		});

		const result = await pongOAuth2Auth(context, { realm: 'pong MCP Server' });

		expect(result).toBe('handled');
		expect(response.writeHead).toHaveBeenCalledWith(code, {
			'WWW-Authenticate': expect.stringContaining(`error="${reason}"`),
		});
	});

	it('responds 503 when the token verifier is unavailable', async () => {
		const { context, response } = buildContext({
			authorization: 'Bearer test-token',
			validation: { valid: false, reason: 'verifier_unavailable' },
		});

		const result = await pongOAuth2Auth(context, { realm: 'pong Webhook' });

		expect(result).toBe('handled');
		expect(response.status).toHaveBeenCalledWith(503);
		expect(response.send).toHaveBeenCalledWith('OAuth token validation is not available');
	});

	it('records the authorization header as consumed once the token is validated', async () => {
		const { context, request } = buildContext({
			authorization: 'Bearer good-token',
			otherHeaders: { 'x-tenant-id': 'acme' },
		});

		await pongOAuth2Auth(context, { realm: 'pong Webhook' });

		expect(request.headers).toEqual({
			authorization: 'Bearer good-token',
			'x-tenant-id': 'acme',
		});

		expect(redactedHeaders(request)).toEqual({
			authorization: REDACTED,
			'x-tenant-id': 'acme',
		});
	});

	it('records nothing when validation fails', async () => {
		const { context, request } = buildContext({
			authorization: 'Bearer bad-token',
			validation: { valid: false, reason: 'invalid_token' },
		});

		await pongOAuth2Auth(context, { realm: 'pong Webhook' });

		expect(redactedHeaders(request)).toEqual({ authorization: 'Bearer bad-token' });
	});

	it('throws when the webhook URL is unavailable', async () => {
		const { context } = buildContext({ webhookUrl: undefined });

		await expect(pongOAuth2Auth(context, { realm: 'pong Webhook' })).rejects.toThrow(
			'Webhook URL is not available',
		);
	});

	describe('browser flow', () => {
		// Only the dispatch is tested here: which modes enter the flow and with what
		// `force`. The navigation heuristics live on `pongBrowserOAuth2Flow` and are
		// covered there.
		it.each<[string, PongOAuth2BrowserFlowMode | undefined]>([
			['bearer', 'bearer'],
			['omitted (e.g. the MCP trigger)', undefined],
		])(
			'never enters the flow for a browser navigation when browserFlow is %s',
			async (_label, browserFlow) => {
				const { context, response } = buildContext({ otherHeaders: { accept: 'text/html' } });

				const result = await pongOAuth2Auth(context, {
					realm: 'pong Webhook',
					method: 'GET',
					browserFlow,
				});

				expect(result).toBe('handled');
				expect(context.beginPongOAuth2Flow).not.toHaveBeenCalled();
				expect(response.writeHead).toHaveBeenCalledWith(401, {
					'WWW-Authenticate': expect.stringContaining('realm="pong Webhook"'),
				});
			},
		);

		it('forces the flow on a plain tokenless GET under browser mode, without any browser signal', async () => {
			const { context, response } = buildContext({ otherHeaders: { accept: 'application/json' } });

			const result = await pongOAuth2Auth(context, {
				realm: 'pong Webhook',
				method: 'GET',
				browserFlow: 'browser',
			});

			expect(result).toBe('handled');
			expect(response.writeHead).toHaveBeenCalledWith(302, { Location: AUTHORIZE_URL });
		});

		it('resolves ok from the one-hop cookie once the browser flow completes', async () => {
			const { context, response, request } = buildContext({
				otherHeaders: { cookie: 'pong-webhook-oauth=cookie-token; theme=dark', accept: 'text/html' },
			});
			context.validatePongOAuth2Token.mockResolvedValue({ valid: true, user: USER });

			const result = await pongOAuth2Auth(context, {
				realm: 'pong Webhook',
				method: 'GET',
				browserFlow: 'auto',
			});

			expect(result).toEqual({
				status: 'ok',
				token: 'cookie-token',
				resource: `${WEBHOOK_URL}?method=GET`,
				user: USER,
			});
			expect(context.validatePongOAuth2Token).toHaveBeenCalledWith(
				'cookie-token',
				`${WEBHOOK_URL}?method=GET`,
			);
			// The cookie carried the access token: it is cleared in the browser, stripped
			// from the request, and the header is recorded as consumed.
			expect(response.clearCookie).toHaveBeenCalledWith(
				'pong-webhook-oauth',
				expect.objectContaining({ path: '/webhook/protected-path' }),
			);
			expect(request.headers.cookie).toBe('theme=dark');
			expect(redactedHeaders(request)).toEqual({ cookie: REDACTED, accept: 'text/html' });
		});
	});
});

describe('resolveOAuthClientMode', () => {
	it('returns the explicit mode regardless of node version', () => {
		expect(resolveOAuthClientMode('bearer', 1)).toBe('bearer');
		expect(resolveOAuthClientMode('bearer', 2.2)).toBe('bearer');
		expect(resolveOAuthClientMode('browser', 1)).toBe('browser');
		expect(resolveOAuthClientMode('auto', 1)).toBe('auto');
	});

	it('defaults an unset mode to bearer below the version threshold, preserving prior behavior for workflows saved before the option existed', () => {
		expect(resolveOAuthClientMode(undefined, 1)).toBe('bearer');
		expect(resolveOAuthClientMode(undefined, 2.1)).toBe('bearer');
	});

	it('defaults an unset mode to auto at or above the version threshold', () => {
		expect(resolveOAuthClientMode(undefined, 2.2)).toBe('auto');
		expect(resolveOAuthClientMode(undefined, 3)).toBe('auto');
	});
});
