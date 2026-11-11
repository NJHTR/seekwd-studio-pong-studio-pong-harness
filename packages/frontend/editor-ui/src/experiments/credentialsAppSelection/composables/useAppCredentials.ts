import { computed, ref, watch } from 'vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { removePreviewToken } from '@/features/shared/nodeCreator/nodeCreator.utils';
import type { CommunityNodeType } from '@pong/api-types';
import type {
	ICredentialType,
	INodeTypeDescription,
	INodeOutputConfiguration,
	NodeConnectionType,
} from 'pong-workflow';
import { NodeConnectionTypes } from 'pong-workflow';

export interface AppInfo {
	name: string;
	displayName: string;
	icon?: string;
	iconDark?: string;
	iconUrl?: string;
	iconUrlDark?: string;
	iconColor?: string;
}

export interface AppEntry {
	app: AppInfo;
	// May be undefined for uninstalled community nodes (credentials unknown until installed)
	credentialType?: ICredentialType;
	supportsInstantOAuth: boolean;
	installed: boolean;
	// For community nodes that need installation
	packageName?: string;
	// true = bundled with pong, false = community node
	isBundled: boolean;
	// For bundled: popularity rank (lower = more popular)
	// For community: number of downloads (higher = more popular)
	popularity?: number;
	// Community node info (for uninstalled community nodes)
	communityNodeInfo?: CommunityNodeType;
}

// Generic credential types that shouldn't be shown as apps
const EXCLUDED_CREDENTIAL_TYPES = new Set([
	'oAuth2Api',
	'oAuth1Api',
	'httpBasicAuth',
	'httpDigestAuth',
	'httpHeaderAuth',
	'httpQueryAuth',
	'httpCustomAuth',
	'noAuth',
]);

// Popularity ranking for bundled apps (lower = more popular)
// Apps not in this list will be sorted alphabetically after ranked apps
// cspell:disable
const BUNDLED_APP_POPULARITY: Record<string, number> = {
	// Google apps
	gmail: 1,
	googlesheets: 2,
	googledrive: 3,
	googlecalendar: 4,
	googledocs: 5,
	// Microsoft apps
	microsoftoutlook: 6,
	microsoftexcel: 7,
	microsoftonedrive: 8,
	microsoftteams: 9,
	// Communication
	slack: 10,
	discord: 11,
	telegram: 12,
	// Productivity
	notion: 13,
	airtable: 14,
	trello: 15,
	asana: 16,
	todoist: 17,
	// CRM & Sales
	hubspot: 18,
	salesforce: 19,
	pipedrive: 20,
	// Dev tools
	github: 21,
	gitlab: 22,
	jira: 23,
	linear: 24,
	// Other popular
	stripe: 25,
	shopify: 26,
	twilio: 27,
	sendgrid: 28,
	mailchimp: 29,
	dropbox: 30,
	zoom: 31,
	calendly: 32,
	typeform: 33,
	intercom: 34,
	zendesk: 35,
	freshdesk: 36,
	clickup: 37,
	mondaycom: 38,
	baserow: 39,
	supabase: 40,
};
// cspell:enable

// Core/utility nodes that shouldn't be shown in app selection
const EXCLUDED_NODE_NAMES = [
	'pong-nodes-base.httpRequest',
	'pong-nodes-base.webhook',
	'pong-nodes-base.code',
	'pong-nodes-base.scheduleTrigger',
	'pong-nodes-base.emailSend',
	'pong-nodes-base.set',
	'pong-nodes-base.if',
	'pong-nodes-base.switch',
	'pong-nodes-base.merge',
	'pong-nodes-base.splitInBatches',
	'pong-nodes-base.noOp',
	'pong-nodes-base.start',
	'pong-nodes-base.stickyNote',
	'pong-nodes-base.executeWorkflow',
	'pong-nodes-base.executeWorkflowTrigger',
	'pong-nodes-base.respondToWebhook',
	'pong-nodes-base.manualTrigger',
	'pong-nodes-base.errorTrigger',
	'pong-nodes-base.function',
	'pong-nodes-base.functionItem',
];

// Exclude all LangChain nodes (AI tools)
const isLangChainNode = (nodeName: string): boolean => {
	// cspell:disable-next-line
	return nodeName.startsWith('@pong/nodes-langchain.');
};

const isExcludedNode = (nodeName: string): boolean => {
	return EXCLUDED_NODE_NAMES.includes(nodeName) || isLangChainNode(nodeName);
};

// Check if a node is a trigger (should be excluded from app selection)
const isTriggerNode = (nodeType: INodeTypeDescription): boolean => {
	return nodeType.group?.includes('trigger') ?? false;
};

// Check if a node is a tool (AI tool nodes should be excluded)
const isToolNode = (nodeType: INodeTypeDescription): boolean => {
	if (!nodeType.outputs || !Array.isArray(nodeType.outputs)) {
		return false;
	}
	const outputTypes = nodeType.outputs.map(
		(output: NodeConnectionType | INodeOutputConfiguration) =>
			typeof output === 'string' ? output : output.type,
	);
	return outputTypes.includes(NodeConnectionTypes.AiTool);
};

export function useAppCredentials() {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const isLoading = ref(true);
	const error = ref<Error | null>(null);

	// Ensure community node previews are fetched
	void nodeTypesStore.fetchCommunityNodePreviews();

	const isOAuth2CredentialType = (credType: ICredentialType): boolean => {
		if (!credType.extends) return false;
		return (
			credType.extends.includes('oAuth2Api') ||
			credType.extends.includes('googleOAuth2Api') ||
			credType.extends.includes('microsoftOAuth2Api') ||
			credType.extends.includes('atlassianOAuth2Api')
		);
	};

	const isOAuth1CredentialType = (credType: ICredentialType): boolean =>
		credType.extends?.includes('oAuth1Api') ?? false;

	const isOAuthCredentialType = (credType: ICredentialType): boolean =>
		isOAuth2CredentialType(credType) || isOAuth1CredentialType(credType);

	const isGoogleOAuthType = (credType: ICredentialType): boolean => {
		if (!credType.extends) return false;
		return credType.extends.includes('googleOAuth2Api');
	};

	const isMicrosoftOAuthType = (credType: ICredentialType): boolean => {
		if (!credType.extends) return false;
		return credType.extends.includes('microsoftOAuth2Api');
	};

	const hasInstantOAuth = (credType: ICredentialType): boolean => {
		if (!isOAuthCredentialType(credType)) return false;

		// Google OAuth types always support instant OAuth (Sign in with Google)
		if (isGoogleOAuthType(credType)) {
			return true;
		}

		// Microsoft OAuth types always support instant OAuth
		if (isMicrosoftOAuthType(credType)) {
			return true;
		}

		// For other OAuth types, check if clientId and clientSecret are pre-configured
		const overwrittenProperties = credType.__overwrittenProperties;
		if (!overwrittenProperties || !Array.isArray(overwrittenProperties)) {
			return false;
		}
		return (
			overwrittenProperties.includes('clientId') && overwrittenProperties.includes('clientSecret')
		);
	};

	// Get priority score for a credential type (higher = better)
	const getCredentialPriority = (credType: ICredentialType): number => {
		const isGoogle = isGoogleOAuthType(credType);
		const isMicrosoft = isMicrosoftOAuthType(credType);
		const isOAuth2 = isOAuth2CredentialType(credType);
		const isOAuth1 = isOAuth1CredentialType(credType);
		const hasInstant = hasInstantOAuth(credType);

		// Google/Microsoft OAuth with native sign-in buttons are highest priority
		if (isGoogle || isMicrosoft) return 6;
		if (isOAuth2 && hasInstant) return 5;
		if (isOAuth1 && hasInstant) return 4;
		if (isOAuth2) return 3;
		if (isOAuth1) return 2;
		return 1; // API key, basic auth, etc.
	};

	// Build AppInfo from node type description
	const buildAppInfo = (nodeType: INodeTypeDescription): AppInfo => {
		// Handle icon which can be a string or a Themed object { light, dark }
		let icon: string | undefined;
		let iconDark: string | undefined;

		if (typeof nodeType.icon === 'string') {
			icon = nodeType.icon;
		} else if (nodeType.icon && typeof nodeType.icon === 'object' && 'light' in nodeType.icon) {
			// Themed icon with light and dark variants
			icon = nodeType.icon.light;
			iconDark = nodeType.icon.dark;
		}

		// Handle iconUrl which can also be a string or a Themed object
		let iconUrl: string | undefined;
		let iconUrlDark: string | undefined;

		if (typeof nodeType.iconUrl === 'string') {
			iconUrl = nodeType.iconUrl;
		} else if (
			nodeType.iconUrl &&
			typeof nodeType.iconUrl === 'object' &&
			'light' in nodeType.iconUrl
		) {
			iconUrl = nodeType.iconUrl.light;
			iconUrlDark = nodeType.iconUrl.dark;
		}

		return {
			name: nodeType.name,
			displayName: nodeType.displayName,
			icon,
			iconDark,
			iconUrl,
			iconUrlDark,
			iconColor: nodeType.iconColor,
		};
	};

	// Find credentials that work with a node type
	const findCredentialsForNode = (
		nodeType: INodeTypeDescription,
		allCredentialTypes: ICredentialType[],
	): ICredentialType[] => {
		const nodeCredentialNames = nodeType.credentials?.map((c) => c.name) ?? [];
		return allCredentialTypes.filter(
			(credType) =>
				nodeCredentialNames.includes(credType.name) &&
				!EXCLUDED_CREDENTIAL_TYPES.has(credType.name),
		);
	};

	const appEntries = computed((): AppEntry[] => {
		const allCredentialTypes = credentialsStore.allCredentialTypes;
		const visibleNodes = nodeTypesStore.visibleNodeTypes;

		if (allCredentialTypes.length === 0 || visibleNodes.length === 0) {
			return [];
		}

		// Build a map of node name -> best credential
		const nodeToEntry = new Map<string, AppEntry>();

		// Helper to process a node and add it to the map
		const processNode = (
			nodeType: INodeTypeDescription,
			isInstalled: boolean,
			isBundled: boolean,
			packageName?: string,
			communityDownloads?: number,
			communityNodeInfo?: CommunityNodeType,
		) => {
			if (isExcludedNode(nodeType.name)) return;
			if (isTriggerNode(nodeType)) return;
			if (isToolNode(nodeType)) return;

			// For installed nodes, require credentials
			// For uninstalled community nodes, we don't have credential info yet - include them anyway
			const credentials = findCredentialsForNode(nodeType, allCredentialTypes);
			const hasCredentials = nodeType.credentials && nodeType.credentials.length > 0;

			if (isInstalled && !hasCredentials) return;
			if (isInstalled && credentials.length === 0) return;

			// Sort credentials by priority and pick the best one (if available)
			let bestCredential: ICredentialType | undefined;
			if (credentials.length > 0) {
				credentials.sort((a, b) => getCredentialPriority(b) - getCredentialPriority(a));
				bestCredential = credentials[0];
			}

			// Use simple name as key to avoid duplicates (e.g., slack and slackV2)
			const simpleName =
				nodeType.name.split('.').pop()?.replace(/V\d+$/, '').toLowerCase() ?? nodeType.name;

			// Get popularity: for bundled apps use hardcoded ranking, for community use downloads
			const popularity = isBundled ? BUNDLED_APP_POPULARITY[simpleName] : communityDownloads;

			// Only add if we don't have this app yet, or if this one has better credentials
			const existing = nodeToEntry.get(simpleName);
			const shouldReplace =
				!existing ||
				(bestCredential &&
					(!existing.credentialType ||
						getCredentialPriority(bestCredential) >
							getCredentialPriority(existing.credentialType)));

			if (shouldReplace) {
				nodeToEntry.set(simpleName, {
					app: buildAppInfo(nodeType),
					credentialType: bestCredential,
					supportsInstantOAuth: bestCredential ? hasInstantOAuth(bestCredential) : false,
					installed: isInstalled,
					isBundled,
					packageName,
					popularity,
					communityNodeInfo,
				});
			}
		};

		// Process visible nodes (installed nodes + official community nodes)
		// Only show verified (official) community nodes
		for (const nodeType of visibleNodes) {
			// Try both with and without preview token since the map key format may vary
			const communityInfo =
				nodeTypesStore.communityNodeType(nodeType.name) ??
				nodeTypesStore.communityNodeType(removePreviewToken(nodeType.name));

			// Skip unofficial community nodes
			if (communityInfo && !communityInfo.isOfficialNode) {
				continue;
			}

			const isInstalled = nodeTypesStore.getIsNodeInstalled(nodeType.name);
			const isBundled = !communityInfo; // No community info = bundled node
			const communityDownloads = communityInfo?.numberOfDownloads;
			const packageName = communityInfo?.packageName;

			processNode(nodeType, isInstalled, isBundled, packageName, communityDownloads, communityInfo);
		}

		// Convert to array and sort:
		// 1. Bundled apps first, sorted by popularity ranking (lower = more popular)
		// 2. Community nodes second, sorted by downloads (higher = more popular)
		// 3. Apps without popularity at the end, sorted alphabetically
		const entries = Array.from(nodeToEntry.values());

		entries.sort((a, b) => {
			// Bundled apps come before community nodes
			if (a.isBundled && !b.isBundled) return -1;
			if (!a.isBundled && b.isBundled) return 1;

			// Both bundled: sort by popularity rank (lower = more popular), then alphabetically
			if (a.isBundled && b.isBundled) {
				const hasPopA = a.popularity !== undefined;
				const hasPopB = b.popularity !== undefined;
				if (hasPopA && !hasPopB) return -1;
				if (!hasPopA && hasPopB) return 1;
				if (hasPopA && hasPopB) return (a.popularity ?? 0) - (b.popularity ?? 0);
				return a.app.displayName.localeCompare(b.app.displayName);
			}

			// Both community: sort by downloads (higher = more popular), then alphabetically
			const hasPopA = a.popularity !== undefined;
			const hasPopB = b.popularity !== undefined;
			if (hasPopA && !hasPopB) return -1;
			if (!hasPopA && hasPopB) return 1;
			if (hasPopA && hasPopB) return (b.popularity ?? 0) - (a.popularity ?? 0);
			return a.app.displayName.localeCompare(b.app.displayName);
		});

		return entries;
	});

	// Watch for node types and credential types to be loaded
	// Similar to how NodeCreator.vue watches for visibleNodeTypes
	watch(
		() => ({
			nodeTypes: nodeTypesStore.visibleNodeTypes,
			credentialTypes: credentialsStore.allCredentialTypes,
		}),
		({ nodeTypes, credentialTypes }) => {
			// Data is loaded when both have values
			if (nodeTypes.length > 0 && credentialTypes.length > 0) {
				isLoading.value = false;
			}
		},
		{ immediate: true },
	);

	return {
		appEntries,
		isLoading,
		error,
	};
}
