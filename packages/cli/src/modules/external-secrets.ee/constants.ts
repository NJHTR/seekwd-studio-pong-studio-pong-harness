import type { INodeProperties } from 'pong-workflow';

export const EXTERNAL_SECRETS_DB_KEY = 'feature.externalSecrets';
export const EXTERNAL_SECRETS_INITIAL_BACKOFF = 10 * 1000;
export const EXTERNAL_SECRETS_MAX_BACKOFF = 5 * 60 * 1000;

export const DOCS_HELP_NOTICE: INodeProperties = {
	displayName:
		'Need help filling out these fields? <a href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" target="_blank">Open docs</a>',
	name: 'notice',
	type: 'notice',
	default: '',
	noDataExpression: true,
};
