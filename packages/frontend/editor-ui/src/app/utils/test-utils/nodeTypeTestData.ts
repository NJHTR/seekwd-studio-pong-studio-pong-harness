import type { INodeTypeDescription } from 'pong-workflow';
import { mock } from 'vitest-mock-extended';

export const nodeTypeTwitter = mock<INodeTypeDescription>({
	displayName: 'X (Formerly Twitter)',
	name: 'pong-nodes-base.twitter',
	version: 1,
	credentials: [{ name: 'twitterOAuth1Api' }],
	properties: [],
});

export const nodeTypeReadImap = mock<INodeTypeDescription>({
	displayName: 'Email Trigger (IMAP)',
	name: 'pong-nodes-base.emailReadImap',
	version: 1,
	credentials: [{ name: 'imap' }],
	properties: [],
});

export const nodeTypeNextCloud = mock<INodeTypeDescription>({
	displayName: 'Nextcloud',
	name: 'pong-nodes-base.nextCloud',
	version: 1,
	credentials: [{ name: 'nextCloudApi' }],
	properties: [],
});

export const nodeTypeTelegram = mock<INodeTypeDescription>({
	name: 'pong-nodes-base.telegram',
	version: 1,
	credentials: [{ name: 'telegramApi', required: true }],
	properties: [],
});

export const nodeTypeHttpRequest = mock<INodeTypeDescription>({
	displayName: 'HTTP Request',
	name: 'pong-nodes-base.httpRequest',
	version: 1,
	credentials: [
		{
			name: 'httpBasicAuth',
			displayOptions: { show: { authentication: ['basicAuth'] }, hide: undefined },
		},
		{
			name: 'httpDigestAuth',
			displayOptions: { show: { authentication: ['digestAuth'] }, hide: undefined },
		},
		{
			name: 'httpHeaderAuth',
			displayOptions: { show: { authentication: ['headerAuth'] }, hide: undefined },
		},
		{
			name: 'httpQueryAuth',
			displayOptions: { show: { authentication: ['queryAuth'] }, hide: undefined },
		},
		{
			name: 'oAuth1Api',
			displayOptions: { show: { authentication: ['oAuth1'] }, hide: undefined },
		},
		{
			name: 'oAuth2Api',
			displayOptions: { show: { authentication: ['oAuth2'] }, hide: undefined },
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			displayOptions: undefined,
			options: [
				{ name: 'Basic Auth', value: 'basicAuth' },
				{ name: 'Digest Auth', value: 'digestAuth' },
				{ name: 'Header Auth', value: 'headerAuth' },
				{ name: 'None', value: 'none' },
				{ name: 'OAuth1', value: 'oAuth1' },
				{ name: 'OAuth2', value: 'oAuth2' },
				{ name: 'Query Auth', value: 'queryAuth' },
			],
			default: 'none',
		},
	],
});
