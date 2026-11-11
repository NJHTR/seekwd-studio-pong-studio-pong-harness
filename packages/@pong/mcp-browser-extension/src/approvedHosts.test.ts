import {
	forgetApprovedHost,
	isHostApproved,
	listApprovedHosts,
	rememberHost,
} from './approvedHosts';

const KEY = 'approvedRelayHosts';

const storage = {
	get: vi.fn(),
	set: vi.fn().mockResolvedValue(undefined),
};

Object.assign(globalThis, { chrome: { storage: { local: storage } } });

/** Seed what `chrome.storage.local.get` reports for the approved-hosts key. */
function seed(value: unknown): void {
	storage.get.mockResolvedValue({ [KEY]: value });
}

beforeEach(() => {
	vi.clearAllMocks();
	seed(undefined);
	storage.set.mockResolvedValue(undefined);
});

describe('isHostApproved', () => {
	it('is true for a stored host', async () => {
		seed(['acme.app.pong.cloud']);
		expect(await isHostApproved('wss://acme.app.pong.cloud/browser-use/x?token=y')).toBe(true);
	});

	it('is false when nothing is stored', async () => {
		expect(await isHostApproved('wss://acme.app.pong.cloud/x')).toBe(false);
	});

	it('treats the same hostname on a different port as a different instance', async () => {
		seed(['localhost:5678']);
		expect(await isHostApproved('ws://localhost:5678/x')).toBe(true);
		expect(await isHostApproved('ws://localhost:5679/x')).toBe(false);
	});

	it('is false for an unparseable URL', async () => {
		seed(['acme.app.pong.cloud']);
		expect(await isHostApproved('not a url')).toBe(false);
		expect(await isHostApproved(null)).toBe(false);
	});

	it('ignores a malformed stored value', async () => {
		seed({ notAnArray: true });
		expect(await isHostApproved('wss://acme.app.pong.cloud/x')).toBe(false);
	});

	it('ignores non-string entries', async () => {
		seed([42, 'acme.app.pong.cloud']);
		expect(await isHostApproved('wss://acme.app.pong.cloud/x')).toBe(true);
	});
});

describe('rememberHost', () => {
	it('appends the host and port', async () => {
		seed(['other.app.pong.cloud']);
		await rememberHost('ws://localhost:5678/x');
		expect(storage.set).toHaveBeenCalledWith({
			[KEY]: ['other.app.pong.cloud', 'localhost:5678'],
		});
	});

	it('does not duplicate an already-stored host', async () => {
		seed(['acme.app.pong.cloud']);
		await rememberHost('wss://acme.app.pong.cloud/x');
		expect(storage.set).not.toHaveBeenCalled();
	});

	it('is a no-op for an unparseable URL', async () => {
		await rememberHost('not a url');
		expect(storage.set).not.toHaveBeenCalled();
	});
});

describe('forgetApprovedHost', () => {
	it('removes only the named host', async () => {
		seed(['acme.app.pong.cloud', 'localhost:5678']);
		await forgetApprovedHost('localhost:5678');
		expect(storage.set).toHaveBeenCalledWith({ [KEY]: ['acme.app.pong.cloud'] });
	});

	it('is a no-op when the host was never stored', async () => {
		seed(['acme.app.pong.cloud']);
		await forgetApprovedHost('localhost:5678');
		expect(storage.set).not.toHaveBeenCalled();
	});
});

describe('listApprovedHosts', () => {
	it('returns every stored host so they can be managed', async () => {
		seed(['acme.app.pong.cloud', 'localhost:5678']);
		expect(await listApprovedHosts()).toEqual(['acme.app.pong.cloud', 'localhost:5678']);
	});

	it('is empty when nothing was ever remembered', async () => {
		expect(await listApprovedHosts()).toEqual([]);
	});
});
