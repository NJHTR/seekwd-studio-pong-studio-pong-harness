import { TEST_CONTAINER_IMAGES } from 'pong-containers/test-containers';
import type { PONGStack } from 'pong-containers/stack';
import { mkdtempSync } from 'node:fs';
import { cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	expect,
	importMarkerName,
	INSTALLABLE_PACKAGES,
	LEGACY_PACKAGE_V3_UPDATE,
	nodeType,
	test,
} from '../../../fixtures/community-packages';
import { versionedName } from '../../../fixtures/community-packages/assertions';
import type { ApiHelpers } from '../../../services/api-helper';

/**
 * A compatible release is installed, its folder on disk is swapped for the
 * release declaring node API level 3, and pong restarts on the same user folder.
 */
const HOME_DIR = mkdtempSync(join(tmpdir(), 'community-packages-startup-'));
const onDisk = LEGACY_PACKAGE_V3_UPDATE;

test.use({
	capability: {
		services: ['npmRegistry'],
		env: {
			PONG_UNVERIFIED_PACKAGES_ENABLED: 'true',
			HOME: '/home/node',
			PONG_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false',
		},
		userHomeHostDir: HOME_DIR,
		user: `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
	},
});

async function restartWithLevel3OnDisk(api: ApiHelpers, stack: PONGStack) {
	await api.enableFeature('communityNodes:customRegistry');
	const install = await api.communityPackages.install(versionedName(INSTALLABLE_PACKAGES.legacy));
	expect(install.status()).toBe(200);

	const packageDir = join(HOME_DIR, '.pong', 'nodes', 'node_modules', onDisk.name);
	await rm(packageDir, { recursive: true, force: true });
	await cp(onDisk.directory, packageDir, { recursive: true });
	await stack.replacePONG({ image: TEST_CONTAINER_IMAGES.pong });
}

async function readMainLogs(stack: PONGStack) {
	const [container] = stack.findContainers(/-pong$/);
	const stream = await container.logs();
	const chunks: Buffer[] = [];
	await new Promise<void>((resolve) => {
		stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
		setTimeout(resolve, 2000);
	});
	return Buffer.concat(chunks).toString('utf8');
}

test.describe(
	'Community node API version guard at startup @mode:sqlite',
	{ annotation: [{ type: 'owner', description: 'NODES' }] },
	() => {
		test.afterAll(async () => {
			await rm(HOME_DIR, { recursive: true, force: true });
		});

		test('skips a package whose on-disk release requires a newer node API', async ({
			api,
			pong,
			pongContainer,
			packageDisk,
			supportedNodesApiVersion,
		}) => {
			test.skip(supportedNodesApiVersion >= 3, 'this instance supports level 3');
			await restartWithLevel3OnDisk(api, pongContainer);

			await expect(api.communityPackages.find(onDisk.name)).resolves.toMatchObject({
				failedLoading: true,
			});
			await expect(api.communityPackages.nodeTypeNames()).resolves.not.toContain(nodeType(onDisk));
			await expect(readMainLogs(pongContainer)).resolves.toContain(
				`Skipping package "${onDisk.name}"`,
			);
			const state = await packageDisk.stateOf(onDisk.name);
			expect(state.importMarkers).not.toContain(importMarkerName(onDisk));

			await pong.navigate.toCommunityNodes();
			await expect(pong.communityNodes.getFailedToLoadIcon(onDisk.name)).toBeVisible();
		});

		test('loads a package whose on-disk release declares the supported node API', async ({
			api,
			pong,
			pongContainer,
			packageDisk,
			supportedNodesApiVersion,
		}) => {
			test.skip(supportedNodesApiVersion < 3, 'this instance does not support level 3');
			await restartWithLevel3OnDisk(api, pongContainer);

			await expect(api.communityPackages.find(onDisk.name)).resolves.toMatchObject({
				failedLoading: false,
			});
			await expect(api.communityPackages.nodeTypeNames()).resolves.toContain(nodeType(onDisk));
			const state = await packageDisk.stateOf(onDisk.name);
			expect(state.importMarkers).toContain(importMarkerName(onDisk));

			await pong.navigate.toCommunityNodes();
			await expect(pong.communityNodes.getCommunityCard(onDisk.name)).toBeVisible();
			await expect(pong.communityNodes.getFailedToLoadIcon(onDisk.name)).toBeHidden();
		});
	},
);
