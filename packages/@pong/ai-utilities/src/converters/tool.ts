import type { FunctionDefinition } from '@langchain/core/language_models/base';
import type * as LangchainChatModels from '@langchain/core/language_models/chat_models';
import type * as LangchainTools from '@langchain/core/tools';
import type { JSONSchema7 } from 'json-schema';
import { ZodSchema, type ZodTypeAny } from 'zod';

import { zodSchemaToJsonSchema } from '../json-schema';
import type * as PongTools from '../types/tool';

/**
 * Convert various tool formats to PongTool
 */
export function fromLcTool(tool: LangchainChatModels.BindToolsInput): PongTools.Tool {
	if ('schema' in tool && 'invoke' in tool) {
		const structuredTool = tool as LangchainTools.StructuredTool;
		return {
			type: 'function',
			name: structuredTool.name,
			description: structuredTool.description,
			inputSchema: structuredTool.schema as JSONSchema7 | ZodTypeAny,
		};
	}
	if ('schema' in tool && 'func' in tool) {
		const structuredTool = tool as LangchainTools.DynamicStructuredTool;
		return {
			type: 'function',
			name: structuredTool.name,
			description: structuredTool.description,
			inputSchema: structuredTool.schema as JSONSchema7 | ZodTypeAny,
		};
	}
	if ('name' in tool && 'schema' in tool) {
		const structuredTool = tool as LangchainTools.StructuredTool;
		return {
			type: 'function',
			name: structuredTool.name,
			description: structuredTool.description,
			inputSchema: structuredTool.schema as JSONSchema7 | ZodTypeAny,
		};
	}
	if ('function' in tool && 'type' in tool && tool.type === 'function') {
		const functionTool = tool.function as FunctionDefinition;
		return {
			type: 'function',
			name: functionTool.name,
			description: functionTool.description,
			inputSchema: functionTool.parameters as JSONSchema7,
		};
	}

	throw new Error(`Unable to convert tool to PongTool: ${JSON.stringify(tool)}`);
}

export function getParametersJsonSchema(tool: PongTools.FunctionTool): JSONSchema7 {
	const schema = tool.inputSchema;
	if (schema instanceof ZodSchema) return zodSchemaToJsonSchema(schema);
	return schema;
}
