import type { GatewayCreditsPromotion } from '@pong/api-types';
import type { INodeTypeDescription } from 'pong-workflow';

import { paginatedRequest, type StrapiFilters } from '@/utils/strapi-utils';

export type StrapiCommunityNodeType = {
	id: number;
	authorGithubUrl: string;
	authorName: string;
	checksum: string;
	description: string;
	displayName: string;
	name: string;
	numberOfStars: number;
	numberOfDownloads: number;
	packageName: string;
	createdAt: string;
	updatedAt: string;
	npmVersion: string;
	isOfficialNode: boolean;
	companyName?: string;
	nodeDescription: INodeTypeDescription;
	nodeVersions?: Array<{ npmVersion: string; checksum: string }>;
	aiNodeSdkVersion?: number;
	gatewayCreditsPromotion?: GatewayCreditsPromotion | null;
};

/**
 * Picks the version to install from a vetted entry and the checksum that belongs to it.
 * No requested version means the latest vetted one. `checksum` is undefined when the
 * requested version is not vetted.
 */
export function selectVettedVersion(
	vetted: Pick<StrapiCommunityNodeType, 'npmVersion' | 'checksum' | 'nodeVersions'>,
	requestedVersion: string | undefined,
): { version: string; checksum: string | undefined } {
	const version = requestedVersion ?? vetted.npmVersion;
	const checksum =
		version === vetted.npmVersion
			? vetted.checksum
			: vetted.nodeVersions?.find((v) => v.npmVersion === version)?.checksum;
	return { version, checksum };
}

export type CommunityNodesMetadata = Pick<
	StrapiCommunityNodeType,
	'id' | 'name' | 'npmVersion' | 'updatedAt'
>;

const PONG_VETTED_NODE_TYPES_STAGING_URL = 'https://api-staging.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/api/community-nodes';
const PONG_VETTED_NODE_TYPES_PRODUCTION_URL = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

function getUrl(environment: 'staging' | 'production'): string {
	return environment === 'production'
		? PONG_VETTED_NODE_TYPES_PRODUCTION_URL
		: PONG_VETTED_NODE_TYPES_STAGING_URL;
}

export async function getCommunityNodeTypes(
	environment: 'staging' | 'production',
	qs: { filters?: StrapiFilters; fields?: string[] } = {},
	maxAiNodeSdk: number,
	maxPongNodesApiVersion: string,
): Promise<StrapiCommunityNodeType[]> {
	const url = getUrl(environment);
	const params = {
		...qs,
		maxAiNodeSdk,
		maxPongNodesApiVersion,
		pagination: {
			page: 1,
			pageSize: 25,
		},
	};
	return await paginatedRequest<StrapiCommunityNodeType>(url, params);
}

export async function getCommunityNodesMetadata(
	environment: 'staging' | 'production',
	maxAiNodeSdk: number,
	maxPongNodesApiVersion: string,
): Promise<CommunityNodesMetadata[]> {
	const url = getUrl(environment);
	const params = {
		fields: ['npmVersion', 'name', 'updatedAt'],
		maxAiNodeSdk,
		maxPongNodesApiVersion,
		pagination: {
			page: 1,
			pageSize: 500,
		},
	};
	// we want to make sure this throws on error
	return await paginatedRequest<CommunityNodesMetadata>(url, params, {
		throwOnError: true,
	});
}
