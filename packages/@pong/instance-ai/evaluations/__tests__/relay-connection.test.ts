// The extension refuses autoConnect unless the relay URL host is localhost
// (relayAllowlist.ts). These tests pin the two shapes that matters: harness
// beside pong (leave everything alone) and harness in a separate container
// (keep saying localhost, redirect at the DNS layer).

import { describe, it, expect } from 'vitest';

import {
	browserPongOrigins,
	browserSessionCookie,
	fixtureInterceptionArgs,
	planRelayConnection,
} from '../harness/browser-runtime';

const EXT = 'chrome-extension://cegmdpndekdfpnafgacidejijecomlhh/connect.html';

function connectUrl(relay: string): string {
	return `${EXT}?mcpRelayUrl=${encodeURIComponent(relay)}&autoConnect=1`;
}

function relayOf(url: string): string {
	return new URL(url).searchParams.get('mcpRelayUrl') ?? '';
}

describe('planRelayConnection', () => {
	it('changes nothing when the harness runs beside pong', () => {
		const input = connectUrl('ws://localhost:5678/rest/x/extension/abc?token=t1');
		const plan = planRelayConnection(input, 'http://localhost:5678');

		expect(plan.connectUrl).toBe(input);
		expect(plan.hostResolverRule).toBeUndefined();
	});

	it('keeps the relay URL on localhost so the extension gate still passes', () => {
		// pong reports localhost (compose sets no editor base URL) but actually
		// lives in another container. Rewriting the URL to say `pong` would make
		// the extension refuse autoConnect outright.
		const plan = planRelayConnection(
			connectUrl('ws://localhost:5678/rest/x/extension/abc?token=t1'),
			'http://pong:5678',
		);

		expect(new URL(relayOf(plan.connectUrl)).hostname).toBe('localhost');
		expect(plan.hostResolverRule).toBe('MAP localhost:5678 pong:5678');
	});

	it('preserves the relay path and token through the rewrite', () => {
		const plan = planRelayConnection(
			connectUrl('ws://localhost:5678/rest/x/extension/abc?token=t1'),
			'http://pong:5678',
		);
		const relay = new URL(relayOf(plan.connectUrl));

		expect(relay.pathname).toBe('/rest/x/extension/abc');
		expect(relay.searchParams.get('token')).toBe('t1');
		expect(new URL(plan.connectUrl).searchParams.get('autoConnect')).toBe('1');
	});

	it('scopes the rule to the relay port', () => {
		// An unscoped `MAP localhost <host>` captures EVERY localhost port in the
		// browser, which would swallow unrelated loopback services.
		const plan = planRelayConnection(
			connectUrl('ws://localhost:5678/rest/x/extension/abc?token=t1'),
			'http://pong-2:5678',
		);
		expect(plan.hostResolverRule).toMatch(/^MAP localhost:5678 /);
	});

	it("retargets the relay onto pong's port when they disagree", () => {
		const plan = planRelayConnection(
			connectUrl('ws://localhost:5678/rest/x/extension/abc?token=t1'),
			'http://pong:5679',
		);
		expect(new URL(relayOf(plan.connectUrl)).port).toBe('5679');
		expect(plan.hostResolverRule).toBe('MAP localhost:5679 pong:5679');
	});

	it('defaults the port from the scheme when the base URL omits it', () => {
		const plan = planRelayConnection(
			connectUrl('ws://localhost:5678/rest/x/extension/abc?token=t1'),
			'https://pong.internal',
		);
		expect(plan.hostResolverRule).toBe('MAP localhost:443 pong.internal:443');
	});

	it('leaves a connect URL with no relay param untouched', () => {
		const plan = planRelayConnection(`${EXT}?autoConnect=1`, 'http://pong:5678');
		expect(plan.connectUrl).toBe(`${EXT}?autoConnect=1`);
		expect(plan.hostResolverRule).toBeUndefined();
	});

	it('degrades to a no-op on unparseable input rather than throwing', () => {
		// A malformed URL must not take the whole run down before the agent starts.
		expect(planRelayConnection('not a url', 'http://pong:5678')).toEqual({
			connectUrl: 'not a url',
		});
		expect(planRelayConnection(connectUrl('ws://localhost:5678/x'), 'nope')).toEqual({
			connectUrl: connectUrl('ws://localhost:5678/x'),
		});
	});
});

describe('planRelayConnection — port mismatches on the same host', () => {
	it('retargets the port when pong is published on a different one, with NO dns rule', () => {
		// The common local shape: pong in a container thinks it is on :5678 while
		// the host reaches it on the published :5680. Same host, so a MAP would
		// be noise — only the port needs rewriting.
		const plan = planRelayConnection(
			connectUrl('ws://localhost:5678/rest/x/extension/abc?token=t1'),
			'http://localhost:5680',
		);
		const relay = new URL(relayOf(plan.connectUrl));
		expect(relay.hostname).toBe('localhost');
		expect(relay.port).toBe('5680');
		expect(plan.hostResolverRule).toBeUndefined();
	});

	it('treats 127.0.0.1 as loopback too — port rewrite, no rule', () => {
		const plan = planRelayConnection(
			connectUrl('ws://localhost:5678/rest/x/extension/abc?token=t1'),
			'http://127.0.0.1:5680',
		);
		expect(new URL(relayOf(plan.connectUrl)).port).toBe('5680');
		expect(plan.hostResolverRule).toBeUndefined();
	});

	it('still emits a rule when the host differs, even if the port matches', () => {
		const plan = planRelayConnection(
			connectUrl('ws://localhost:5678/rest/x/extension/abc?token=t1'),
			'http://pong:5678',
		);
		expect(plan.hostResolverRule).toBe('MAP localhost:5678 pong:5678');
	});
});

describe('fixtureInterceptionArgs', () => {
	const FIXTURE_RULES = 'MAP console.anthropic.com 127.0.0.1:8443,MAP * 127.0.0.1:8443';
	const rulesOf = (args: string[]) =>
		args
			.find((a) => a.startsWith('--host-resolver-rules='))
			?.split('=')
			.slice(1)
			.join('=') ?? '';

	it('never disables certificate checking for a real-site run', () => {
		// The cert flag exists only for the fixture's self-signed cert. Local mode
		// browses the real internet in the developer's own profile.
		expect(fixtureInterceptionArgs(undefined, undefined)).toEqual([]);
		expect(fixtureInterceptionArgs(undefined, 'MAP localhost:5680 pong:5678')).not.toContain(
			'--ignore-certificate-errors',
		);
	});

	it('pairs the cert flag with the fixture rules, never one without the other', () => {
		expect(fixtureInterceptionArgs(FIXTURE_RULES, undefined)).toContain(
			'--ignore-certificate-errors',
		);
	});

	it('passes ONE resolver flag — a second silently drops the first', () => {
		const args = fixtureInterceptionArgs(FIXTURE_RULES, 'MAP localhost:5680 pong:5678');
		expect(args.filter((a) => a.startsWith('--host-resolver-rules='))).toHaveLength(1);
	});

	it('orders the relay rule ahead of the catch-all, since first match wins', () => {
		const rules = rulesOf(fixtureInterceptionArgs(FIXTURE_RULES, 'MAP localhost:5680 pong:5678'));
		expect(rules.indexOf('MAP localhost:5680')).toBeLessThan(rules.indexOf('MAP *'));
	});

	it('excludes every loopback spelling the extension accepts, not just localhost', () => {
		// The relay can be reached as 127.0.0.1 or [::1] too (relayAllowlist's
		// LOCAL_HOSTS); leaving those to the catch-all would swallow the relay.
		const rules = rulesOf(fixtureInterceptionArgs(FIXTURE_RULES, undefined));
		expect(rules).toContain('EXCLUDE localhost');
		expect(rules).toContain('EXCLUDE 127.0.0.1');
		expect(rules).toContain('EXCLUDE [::1]');
	});

	it('keeps the other loopback excludes even when a relay rule is present', () => {
		// The relay MAP is PORT-scoped, so other loopback ports would still fall
		// through to the wildcard without these. Neither spelling collides with a
		// `MAP localhost:<port>` rule — exclusions match on hostname.
		const rules = rulesOf(fixtureInterceptionArgs(FIXTURE_RULES, 'MAP localhost:5680 pong:5678'));
		expect(rules).toContain('EXCLUDE 127.0.0.1');
		expect(rules).toContain('EXCLUDE [::1]');
	});

	it('drops the localhost exclude when a relay rule needs that hostname', () => {
		// Chromium checks EXCLUDEs before MAPs and returns on the first match, so
		// `EXCLUDE localhost` vetoes `MAP localhost:<port> …` no matter where it
		// sits in the string (verified against Chromium 1223: the MAP applies
		// alone, and stops applying in either order once the exclude is added).
		// Emitting both left the extension resolving localhost inside its own
		// container instead of reaching pong.
		const rules = rulesOf(fixtureInterceptionArgs(FIXTURE_RULES, 'MAP localhost:5680 pong:5678'));
		expect(rules).not.toContain('EXCLUDE localhost');
		expect(rules).toContain('MAP localhost:5680 pong:5678');
	});
});

// The session cookie the launched browser is given. Same subject as the rest of
// this file: which spelling of pong the BROWSER ends up using, after the rewrite
// above. Get it wrong and the credential-setup flow dead-ends on /signin with
// every provider-console expectation failing as though the agent misbehaved.
describe('browserPongOrigins', () => {
	it('returns the single origin when pong is already loopback', () => {
		expect(browserPongOrigins('http://localhost:5678')).toEqual(['http://localhost:5678']);
	});

	it('adds the localhost origin the relay MAP rule creates for a non-loopback pong', () => {
		// planRelayConnection rewrites a non-loopback pong to localhost + a MAP rule,
		// so in the split-container topology the browser knows pong by THAT origin —
		// a cookie on `http://pong:5678` alone would never be sent.
		expect(browserPongOrigins('http://pong:5678')).toEqual([
			'http://pong:5678',
			'http://localhost:5678',
		]);
	});
});

describe('browserSessionCookie', () => {
	it('turns the client cookie header into a cookie for the browser context', () => {
		expect(browserSessionCookie('pong-auth=abc123', 'http://localhost:5678')).toEqual({
			name: 'pong-auth',
			value: 'abc123',
			url: 'http://localhost:5678',
		});
	});

	it('splits on the FIRST = only, so a base64/JWT value survives intact', () => {
		const value = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0=';
		expect(browserSessionCookie(`pong-auth=${value}`, 'http://pong:5678')?.value).toBe(value);
	});

	it('returns undefined for anything that is not a name=value pair', () => {
		expect(browserSessionCookie('', 'http://localhost:5678')).toBeUndefined();
		expect(browserSessionCookie('pong-auth', 'http://localhost:5678')).toBeUndefined();
		expect(browserSessionCookie('=orphan', 'http://localhost:5678')).toBeUndefined();
	});
});
