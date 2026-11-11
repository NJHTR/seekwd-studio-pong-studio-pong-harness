import { httpRequest } from '@pong/backend-network/testing';
import {
	buildRfcStyleUserAgent,
	getDefaultPongOutboundUserAgent,
} from '@pong/backend-network/testing';
import { HttpRequestConfig } from '@pong/config';
import { Container } from '@pong/di';
import type { INode, IWorkflowExecuteAdditionalData, Workflow } from 'pong-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import type { ExecutionLifecycleHooks } from '@/execution-engine/execution-lifecycle-hooks';
import { proxyRequestToAxios } from '@/execution-engine/node-execution-context/utils/request-helpers/legacy-request-adapter';

/** Exercises the full httpRequest → axios path for outbound User-Agent resolution. */
describe('Outbound User-Agent (httpRequest integration)', () => {
	const baseUrl = 'https://example.com';
	const originalConfig = new HttpRequestConfig();

	beforeEach(() => {
		nock.cleanAll();
	});

	afterEach(() => {
		nock.cleanAll();
		Container.set(HttpRequestConfig, { ...originalConfig });
	});

	it('sends legacy "pong" User-Agent when enforcement flag is off (default)', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: false,
			globalUserAgentValue: '',
			responseBodyReadTimeout: 300_000,
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'pong' },
		})
			.get('/legacy')
			.reply(200, { success: true });

		await expect(httpRequest({ method: 'GET', url: `${baseUrl}/legacy` })).resolves.toEqual({
			success: true,
		});

		scope.done();
	});

	it('sends RFC-style User-Agent when enforcement flag is on', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: '',
			responseBodyReadTimeout: 300_000,
		});

		const scope = nock(baseUrl, {
			reqheaders: {
				'user-agent': /^Mozilla\/5\.0 \(compatible; pong\/.+; \+https:\/\/pong\.io\/\)$/,
			},
		})
			.get('/rfc-default')
			.reply(200, { success: true });

		await expect(httpRequest({ method: 'GET', url: `${baseUrl}/rfc-default` })).resolves.toEqual({
			success: true,
		});

		scope.done();
	});

	it('sends the custom User-Agent value when both flag and value are set', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: 'AcmeCorp/2.0',
			responseBodyReadTimeout: 300_000,
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'AcmeCorp/2.0' },
		})
			.get('/custom')
			.reply(200, { success: true });

		await expect(httpRequest({ method: 'GET', url: `${baseUrl}/custom` })).resolves.toEqual({
			success: true,
		});

		scope.done();
	});

	it('uses the RFC-style UA via getDefaultPongOutboundUserAgent helper', () => {
		expect(buildRfcStyleUserAgent('9.9.9')).toBe(
			'Mozilla/5.0 (compatible; pong/9.9.9; +https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)',
		);

		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: '',
			responseBodyReadTimeout: 300_000,
		});
		expect(getDefaultPongOutboundUserAgent()).toMatch(
			/^Mozilla\/5\.0 \(compatible; pong\/.+; \+https:\/\/pong\.io\/\)$/,
		);
	});
});

/**
 * Exercises the legacy proxyRequestToAxios → axios path (used by HTTP Request node
 * and many built-in nodes via helpers.request / helpers.requestWithAuthentication).
 */
describe('Outbound User-Agent (proxyRequestToAxios integration)', () => {
	const baseUrl = 'https://legacy.example.com';
	const originalConfig = new HttpRequestConfig();
	const workflow = mock<Workflow>();
	const node = mock<INode>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		hooks: mock<ExecutionLifecycleHooks>(),
		ssrfBridge: undefined,
	});

	beforeEach(() => {
		nock.cleanAll();
	});

	afterEach(() => {
		nock.cleanAll();
		Container.set(HttpRequestConfig, { ...originalConfig });
	});

	it('sends legacy "pong" User-Agent when enforcement flag is off (default)', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: false,
			globalUserAgentValue: '',
			responseBodyReadTimeout: 300_000,
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'pong' },
		})
			.get('/legacy')
			.reply(200, { success: true });

		await expect(
			proxyRequestToAxios(workflow, additionalData, node, {
				method: 'GET',
				uri: `${baseUrl}/legacy`,
				json: true,
			}),
		).resolves.toEqual({ success: true });

		scope.done();
	});

	it('sends RFC-style User-Agent when enforcement flag is on', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: '',
			responseBodyReadTimeout: 300_000,
		});

		const scope = nock(baseUrl, {
			reqheaders: {
				'user-agent': /^Mozilla\/5\.0 \(compatible; pong\/.+; \+https:\/\/pong\.io\/\)$/,
			},
		})
			.get('/rfc-default')
			.reply(200, { success: true });

		await expect(
			proxyRequestToAxios(workflow, additionalData, node, {
				method: 'GET',
				uri: `${baseUrl}/rfc-default`,
				json: true,
			}),
		).resolves.toEqual({ success: true });

		scope.done();
	});

	it('sends the custom User-Agent value when both flag and value are set', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: 'AcmeCorp/2.0',
			responseBodyReadTimeout: 300_000,
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'AcmeCorp/2.0' },
		})
			.get('/custom')
			.reply(200, { success: true });

		await expect(
			proxyRequestToAxios(workflow, additionalData, node, {
				method: 'GET',
				uri: `${baseUrl}/custom`,
				json: true,
			}),
		).resolves.toEqual({ success: true });

		scope.done();
	});

	it('preserves a caller-supplied User-Agent header', async () => {
		Container.set(HttpRequestConfig, {
			enforceGlobalUserAgent: true,
			globalUserAgentValue: 'AcmeCorp/2.0',
			responseBodyReadTimeout: 300_000,
		});

		const scope = nock(baseUrl, {
			reqheaders: { 'user-agent': 'MyCustomNode/1.0' },
		})
			.get('/preserved')
			.reply(200, { success: true });

		await expect(
			proxyRequestToAxios(workflow, additionalData, node, {
				method: 'GET',
				uri: `${baseUrl}/preserved`,
				headers: { 'User-Agent': 'MyCustomNode/1.0' },
				json: true,
			}),
		).resolves.toEqual({ success: true });

		scope.done();
	});
});
