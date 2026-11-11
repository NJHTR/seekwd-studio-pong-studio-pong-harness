import type { PackagePolicyRestrictions } from '@pong/api-types';
import { NPM_COMMUNITY_NODE_SEARCH_API_URL } from '@pong/constants';
import type { PublicInstalledPackage } from 'pong-workflow';

import type { IRestApiContext } from '../types';
import { get, makeRestApiRequest } from '../utils';

export type InstalledPackageWithRestrictions = PublicInstalledPackage & {
	policyRestrictions?: PackagePolicyRestrictions;
};

export async function getInstalledCommunityNodes(
	context: IRestApiContext,
): Promise<PublicInstalledPackage[]> {
	const response = await get(context.baseUrl, '/community-packages');
	return response.data || [];
}

export async function installNewPackage(
	context: IRestApiContext,
	name: string,
	version?: string,
): Promise<InstalledPackageWithRestrictions> {
	return await makeRestApiRequest(context, 'POST', '/community-packages', { name, version });
}

export async function uninstallPackage(context: IRestApiContext, name: string): Promise<void> {
	return await makeRestApiRequest(context, 'DELETE', '/community-packages', { name });
}

export async function updatePackage(
	context: IRestApiContext,
	name: string,
	version?: string,
): Promise<PublicInstalledPackage> {
	return await makeRestApiRequest(context, 'PATCH', '/community-packages', { name, version });
}

export async function getAvailableCommunityPackageCount(): Promise<number> {
	const response = await get(
		NPM_COMMUNITY_NODE_SEARCH_API_URL,
		'search?q=keywords:pong-community-node-package',
	);

	return response.total || 0;
}
