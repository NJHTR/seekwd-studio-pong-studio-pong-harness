/**
 * Dynamic tool registration and callback types.
 * Source: easyCode `app-server-protocol/schema/typescript/v2/{DynamicToolSpec,DynamicToolFunctionSpec,DynamicToolCallParams,DynamicToolCallResponse,DynamicToolCallOutputContentItem}.ts`.
 *
 * `dynamicTools` on `thread/start` is experimental in the current build. The
 * client must send `capabilities.experimentalApi = true` during initialize.
 */

import type { JsonValue } from './json';

export interface DynamicToolFunctionSpec {
	name: string;
	description: string;
	inputSchema: JsonValue;
	deferLoading?: boolean;
}

export interface DynamicToolNamespaceSpec {
	name: string;
	description: string;
	tools: DynamicToolFunctionSpec[];
}

export type DynamicToolSpec =
	| ({ type: 'function' } & DynamicToolFunctionSpec)
	| ({ type: 'namespace' } & DynamicToolNamespaceSpec);

export interface DynamicToolCallParams {
	threadId: string;
	turnId: string;
	callId: string;
	namespace: string | null;
	tool: string;
	arguments: JsonValue;
}

export type DynamicToolCallOutputContentItem =
	| { type: 'inputText'; text: string }
	| { type: 'inputImage'; imageUrl: string }
	| { type: 'inputAudio'; audioUrl: string };

export interface DynamicToolCallResponse {
	contentItems: DynamicToolCallOutputContentItem[];
	success: boolean;
}
