import { PONG_NODES_API_VERSION } from '@pong/constants';
import { Container } from '@pong/di';

import { CommunityPackagesConfig } from '../community-packages.config';

describe('CommunityPackagesConfig', () => {
	let envSnapshot: NodeJS.ProcessEnv;

	beforeEach(() => {
		envSnapshot = { ...process.env };
		Container.reset();
	});

	afterEach(() => {
		process.env = envSnapshot;
	});

	it('enables community packages by default', () => {
		expect(Container.get(CommunityPackagesConfig).enabled).toBe(true);
	});

	it('disables community packages when listed in PONG_DISABLED_MODULES', () => {
		process.env.PONG_DISABLED_MODULES = 'community-packages';

		expect(Container.get(CommunityPackagesConfig).enabled).toBe(false);
	});

	it('disables community packages when listed among other disabled modules', () => {
		process.env.PONG_DISABLED_MODULES = 'insights,community-packages,mcp';

		expect(Container.get(CommunityPackagesConfig).enabled).toBe(false);
	});

	it('leaves community packages enabled when only other modules are disabled', () => {
		process.env.PONG_DISABLED_MODULES = 'insights,mcp';

		expect(Container.get(CommunityPackagesConfig).enabled).toBe(true);
	});

	it('keeps explicit PONG_COMMUNITY_PACKAGES_ENABLED=false', () => {
		process.env.PONG_COMMUNITY_PACKAGES_ENABLED = 'false';

		expect(Container.get(CommunityPackagesConfig).enabled).toBe(false);
	});

	it('exposes the supported nodes API version', () => {
		expect(Container.get(CommunityPackagesConfig).nodesApiVersion).toBe(PONG_NODES_API_VERSION);
	});
});
