import type { ConfigEnv, UserConfig } from 'vite';
import { describe, expect, it } from 'vitest';

import { BACKEND_PROXY_PATTERN, devServerPlugin, resolveDevPorts } from './dev-ports.mjs';

const runConfigHook = (env: NodeJS.ProcessEnv, configEnv: ConfigEnv) => {
	const plugin = devServerPlugin(env);
	const hook = plugin.config as (c: UserConfig, e: ConfigEnv) => UserConfig | undefined;
	return hook({}, configEnv);
};

const DEV: ConfigEnv = { command: 'serve', mode: 'development' };
const VITEST: ConfigEnv = { command: 'serve', mode: 'test' };
const PREVIEW: ConfigEnv = { command: 'serve', mode: 'production', isPreview: true };

describe('resolveDevPorts', () => {
	it.each([
		['unset', {}, 5678, 8080],
		['empty', { PONG_PORT: '', PONG_EDITOR_PORT: '' }, 5678, 8080],
		['set', { PONG_PORT: '5699', PONG_EDITOR_PORT: '8082' }, 5699, 8082],
	])('resolves %s ports', (_label, env, backendPort, editorPort) => {
		expect(resolveDevPorts(env)).toEqual({ backendPort, editorPort });
	});

	it.each(['abc', '0', '70000', '5699.5', '-1'])('rejects the malformed port %s', (value) => {
		expect(() => resolveDevPorts({ PONG_EDITOR_PORT: value })).toThrow(
			`PONG_EDITOR_PORT must be a port number, got: ${value}`,
		);
	});

	it('names the offending variable', () => {
		expect(() => resolveDevPorts({ PONG_PORT: 'abc' })).toThrow(/^PONG_PORT must be/);
	});
});

describe('BACKEND_PROXY_PATTERN', () => {
	const pattern = new RegExp(BACKEND_PROXY_PATTERN);

	it.each([
		'/rest',
		'/rest/settings',
		'/rest/push?pushRef=abc',
		'/types/nodes.json',
		'/schemas/pong-nodes-base.set/1.json',
		'/icons/pong-nodes-base/dist/nodes/Set/set.svg',
		'/webhook-test/abc',
		'/form/abc',
		'/healthz/readiness',
	])('forwards the backend route %s', (url) => {
		expect(pattern.test(url)).toBe(true);
	});

	it.each(['/', '/restore', '/formatting', '/apifoo', '/home/workflows', '/workflow/123'])(
		'leaves the editor route %s to Vite',
		(url) => {
			expect(pattern.test(url)).toBe(false);
		},
	);
});

describe('devServerPlugin', () => {
	it('never applies to builds', () => {
		expect(devServerPlugin({}).apply).toBe('serve');
	});

	it('binds the editor port and proxies backend routes to PONG_PORT', () => {
		expect(runConfigHook({ PONG_PORT: '5699', PONG_EDITOR_PORT: '8082' }, DEV)).toEqual({
			server: {
				host: true,
				port: 8082,
				strictPort: true,
				proxy: { [BACKEND_PROXY_PATTERN]: { target: 'http://localhost:5699', ws: true } },
			},
		});
	});

	it('falls back to the default ports', () => {
		expect(runConfigHook({}, DEV)?.server).toMatchObject({
			port: 8080,
			proxy: { [BACKEND_PROXY_PATTERN]: { target: 'http://localhost:5678' } },
		});
	});

	// The push origin check compares Host with the browser's Origin, so the
	// proxy must not rewrite Host to the backend's.
	it('keeps the editor Host header on proxied requests', () => {
		const proxy = runConfigHook({}, DEV)?.server?.proxy as Record<string, object>;

		expect(proxy[BACKEND_PROXY_PATTERN]).not.toHaveProperty('changeOrigin');
	});

	// The editor derives its REST base from window.BASE_PATH, so every call goes
	// through the proxy. A build that inherited this var would ship a localhost base.
	it.each([
		['dev', DEV],
		['vitest', VITEST],
		['preview', PREVIEW],
	])('never sets VUE_APP_URL_BASE_API in %s', (_label, configEnv) => {
		const env: NodeJS.ProcessEnv = {};

		runConfigHook(env, configEnv);

		expect(env.VUE_APP_URL_BASE_API).toBeUndefined();
	});

	// vitest must not bind a port.
	it.each([
		['vitest', VITEST],
		['preview', PREVIEW],
	])('stays out of the way of %s', (_label, configEnv) => {
		expect(runConfigHook({ PONG_EDITOR_PORT: '8082' }, configEnv)).toBeUndefined();
	});

	it('does not validate ports outside the dev server', () => {
		expect(() => runConfigHook({ PONG_EDITOR_PORT: 'abc' }, VITEST)).not.toThrow();
	});
});
