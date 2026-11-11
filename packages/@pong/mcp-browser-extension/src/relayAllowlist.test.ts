import {
	getRelayHostKey,
	isAllowedPageOrigin,
	isAllowedRelayUrl,
	isLocalhostRelay,
} from './relayAllowlist';

describe('isAllowedRelayUrl', () => {
	it('allows pong cloud tenant subdomains over wss', () => {
		expect(isAllowedRelayUrl('wss://acme.app.pong.cloud/browser-use/extension/s?token=t')).toBe(
			true,
		);
		expect(isAllowedRelayUrl('wss://acme.stage-app.pong.cloud/browser-use/extension/s')).toBe(true);
	});

	it('allows the bare cloud apex', () => {
		expect(isAllowedRelayUrl('wss://app.pong.cloud/x')).toBe(true);
	});

	it('allows localhost relays for local development', () => {
		expect(isAllowedRelayUrl('ws://localhost:5680/browser-use/cdp/s')).toBe(true);
		// Plaintext is loopback-only, so a stored approval can't be spent over one.
		expect(isAllowedRelayUrl('ws://acme.app.pong.cloud/x')).toBe(false);
		expect(isAllowedRelayUrl('ws://127.0.0.1:5680/x')).toBe(true);
		expect(isAllowedRelayUrl('ws://[::1]:5680/x')).toBe(true);
	});

	it('rejects unrecognized hosts', () => {
		expect(isAllowedRelayUrl('wss://evil.com/x')).toBe(false);
		expect(isAllowedRelayUrl('wss://notpongcloud.com/x')).toBe(false);
	});

	it('rejects suffix-spoofing hosts', () => {
		expect(isAllowedRelayUrl('wss://app.pong.cloud.evil.com/x')).toBe(false);
		expect(isAllowedRelayUrl('wss://evil-app.pong.cloud.attacker.net/x')).toBe(false);
	});

	it('rejects non-websocket schemes', () => {
		expect(isAllowedRelayUrl('https://acme.app.pong.cloud/x')).toBe(false);
		expect(isAllowedRelayUrl('http://localhost:5680/x')).toBe(false);
	});

	it('rejects malformed or empty input', () => {
		expect(isAllowedRelayUrl('not a url')).toBe(false);
		expect(isAllowedRelayUrl('')).toBe(false);
		expect(isAllowedRelayUrl(null)).toBe(false);
		expect(isAllowedRelayUrl(undefined)).toBe(false);
	});
});

describe('isAllowedPageOrigin', () => {
	it('allows pong cloud origins over https', () => {
		expect(isAllowedPageOrigin('https://acme.app.pong.cloud')).toBe(true);
		expect(isAllowedPageOrigin('https://acme.stage-app.pong.cloud')).toBe(true);
	});

	it('allows local origins over http and https', () => {
		expect(isAllowedPageOrigin('http://localhost:5678')).toBe(true);
		expect(isAllowedPageOrigin('https://localhost:5678')).toBe(true);
		expect(isAllowedPageOrigin('http://127.0.0.1:5678')).toBe(true);
	});

	it('rejects cloud hosts over plain http', () => {
		expect(isAllowedPageOrigin('http://acme.app.pong.cloud')).toBe(false);
	});

	it('rejects unrecognized and suffix-spoofing origins', () => {
		expect(isAllowedPageOrigin('https://evil.example.com')).toBe(false);
		expect(isAllowedPageOrigin('https://app.pong.cloud.evil.com')).toBe(false);
	});

	it('rejects malformed or empty input', () => {
		expect(isAllowedPageOrigin('not a url')).toBe(false);
		expect(isAllowedPageOrigin('')).toBe(false);
		expect(isAllowedPageOrigin(null)).toBe(false);
		expect(isAllowedPageOrigin(undefined)).toBe(false);
	});
});

describe('isLocalhostRelay', () => {
	it('is true only for local hosts', () => {
		expect(isLocalhostRelay('ws://localhost:5680/x')).toBe(true);
		expect(isLocalhostRelay('ws://127.0.0.1:5680/x')).toBe(true);
		expect(isLocalhostRelay('ws://[::1]:5680/x')).toBe(true);
		expect(isLocalhostRelay('wss://acme.app.pong.cloud/x')).toBe(false);
		expect(isLocalhostRelay(null)).toBe(false);
	});
});

describe('getRelayHostKey', () => {
	it('keeps the port so two local instances stay distinct', () => {
		expect(getRelayHostKey('ws://localhost:5678/x')).toBe('localhost:5678');
		expect(getRelayHostKey('ws://localhost:5679/x')).toBe('localhost:5679');
	});

	it('omits the port when it is the default for the protocol', () => {
		expect(getRelayHostKey('wss://acme.app.pong.cloud/x')).toBe('acme.app.pong.cloud');
		expect(getRelayHostKey('wss://acme.app.pong.cloud:443/x')).toBe('acme.app.pong.cloud');
	});

	it('returns null for malformed or empty input', () => {
		expect(getRelayHostKey('not a url')).toBeNull();
		expect(getRelayHostKey(null)).toBeNull();
		expect(getRelayHostKey(undefined)).toBeNull();
	});
});
