import { HttpRequestConfig } from '@pong/config';
import { Container } from '@pong/di';
import * as nodePathActual from 'node:path';

import { buildRfcStyleUserAgent, getDefaultPongOutboundUserAgent } from '../user-agent';

describe('outbound-user-agent', () => {
	const originalConfig = new HttpRequestConfig();

	afterEach(() => {
		Container.set(HttpRequestConfig, { ...originalConfig });
		vi.resetModules();
	});

	describe('buildRfcStyleUserAgent', () => {
		it('formats a conventional product token', () => {
			expect(buildRfcStyleUserAgent('1.2.3')).toBe(
				'Mozilla/5.0 (compatible; pong/1.2.3; +https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)',
			);
		});
	});

	describe('getDefaultPongOutboundUserAgent', () => {
		it('returns the legacy "pong" value when the enforce flag is off', () => {
			Container.set(HttpRequestConfig, {
				enforceGlobalUserAgent: false,
				globalUserAgentValue: '',
				responseBodyReadTimeout: 300_000,
			});

			expect(getDefaultPongOutboundUserAgent()).toBe('pong');
		});

		it('returns the legacy "pong" value even when a custom UA is set but the flag is off', () => {
			Container.set(HttpRequestConfig, {
				enforceGlobalUserAgent: false,
				globalUserAgentValue: 'some-custom-value',
				responseBodyReadTimeout: 300_000,
			});

			expect(getDefaultPongOutboundUserAgent()).toBe('pong');
		});

		it('returns the RFC-style UA with pong version when the enforce flag is on', () => {
			Container.set(HttpRequestConfig, {
				enforceGlobalUserAgent: true,
				globalUserAgentValue: '',
				responseBodyReadTimeout: 300_000,
			});

			expect(getDefaultPongOutboundUserAgent()).toMatch(
				/^Mozilla\/5\.0 \(compatible; pong\/.+; \+https:\/\/pong\.io\/\)$/,
			);
		});

		it('returns the custom UA verbatim when both the flag and custom value are set', () => {
			Container.set(HttpRequestConfig, {
				enforceGlobalUserAgent: true,
				globalUserAgentValue: 'AcmeCorp/1.0',
				responseBodyReadTimeout: 300_000,
			});

			expect(getDefaultPongOutboundUserAgent()).toBe('AcmeCorp/1.0');
		});

		it('falls back to version "0.0.0" when the package.json cannot be resolved', async () => {
			vi.resetModules();
			vi.doMock('node:path', () => ({
				...nodePathActual,
				default: { ...nodePathActual, join: () => '/definitely/not/a/real/path/package.json' },
				join: () => '/definitely/not/a/real/path/package.json',
			}));

			const di = await import('@pong/di');
			const config = await import('@pong/config');
			const mod = await import('../user-agent.js');

			di.Container.set(config.HttpRequestConfig, {
				enforceGlobalUserAgent: true,
				globalUserAgentValue: '',
				responseBodyReadTimeout: 300_000,
			});

			expect(mod.getDefaultPongOutboundUserAgent()).toBe(
				'Mozilla/5.0 (compatible; pong/0.0.0; +https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)',
			);

			vi.doUnmock('node:path');
		});
	});
});
