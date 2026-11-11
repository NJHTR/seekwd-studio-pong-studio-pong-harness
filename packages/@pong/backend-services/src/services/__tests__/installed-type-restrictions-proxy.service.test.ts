import { mock } from 'vitest-mock-extended';

import {
	type InstalledTypeRestrictionsProvider,
	InstalledTypeRestrictionsProxy,
} from '../installed-type-restrictions-proxy.service';

describe('InstalledTypeRestrictionsProxy', () => {
	test('returns null when no provider is registered', async () => {
		const proxy = new InstalledTypeRestrictionsProxy();

		await expect(proxy.describeRestrictions({ nodeTypes: ['pong-nodes-a.a'] })).resolves.toBeNull();
	});

	test('forwards to the registered provider', async () => {
		const proxy = new InstalledTypeRestrictionsProxy();
		const provider = mock<InstalledTypeRestrictionsProvider>();
		const restrictions = {
			nodeTypes: [{ type: 'pong-nodes-a.a', blockedOn: 'instance' as const, optInAvailable: false }],
		};
		provider.describeRestrictions.mockResolvedValue(restrictions);
		proxy.registerProvider(provider);

		await expect(proxy.describeRestrictions({ nodeTypes: ['pong-nodes-a.a'] })).resolves.toBe(
			restrictions,
		);
		expect(provider.describeRestrictions).toHaveBeenCalledWith({ nodeTypes: ['pong-nodes-a.a'] });
	});
});
