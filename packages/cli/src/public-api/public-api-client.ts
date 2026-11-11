import { PONG_CLIENT_EDITOR_UI } from '@pong/api-types';

export type PublicApiClient = 'editor_ui' | 'other';

export function resolvePublicApiClient(header: string | string[] | undefined): PublicApiClient {
	const value = Array.isArray(header) ? header[0] : header;
	return value?.trim().toLowerCase() === PONG_CLIENT_EDITOR_UI ? 'editor_ui' : 'other';
}
