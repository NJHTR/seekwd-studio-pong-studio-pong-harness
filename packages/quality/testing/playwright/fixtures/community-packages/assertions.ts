import { expect } from '../base';
import { importMarkerName, nodeType, type FixturePackage } from './fixture-packages';
import type { PackageDisk } from './index';
import type { pongPage } from '../../pages/pongPage';
import type { ApiHelpers } from '../../services/api-helper';

export const versionedName = (pkg: FixturePackage) => `${pkg.name}@${pkg.version}`;

export async function expectInstalled(api: ApiHelpers, disk: PackageDisk, pkg: FixturePackage) {
	await expect(api.communityPackages.find(pkg.name)).resolves.toMatchObject({
		installedVersion: pkg.version,
	});
	await expect(api.communityPackages.nodeTypeNames()).resolves.toContain(nodeType(pkg));
	const state = await disk.stateOf(pkg.name);
	expect(state.installedVersion).toBe(pkg.version);
	expect(state.importMarkers).toContain(importMarkerName(pkg));
}

export async function expectAbsent(api: ApiHelpers, disk: PackageDisk, pkg: FixturePackage) {
	await expect(api.communityPackages.find(pkg.name)).resolves.toBeUndefined();
	await expect(api.communityPackages.nodeTypeNames()).resolves.not.toContain(nodeType(pkg));
	await expect(disk.stateOf(pkg.name)).resolves.toEqual({
		installedVersion: undefined,
		importMarkers: [],
	});
}

export async function expectRejectedOnSettingsPage(
	{ pong, api, packageDisk }: { pong: pongPage; api: ApiHelpers; packageDisk: PackageDisk },
	pkg: FixturePackage,
	error: RegExp,
) {
	await pong.navigate.toCommunityNodes();
	await pong.communityNodes.submitInstall(versionedName(pkg));
	await expect(
		pong.notifications.getNotificationByTitle('Package not compatible with this pong version'),
	).toBeVisible();
	await expect(pong.communityNodes.getInstallModalError(error)).toBeVisible();
	await expectAbsent(api, packageDisk, pkg);
}
