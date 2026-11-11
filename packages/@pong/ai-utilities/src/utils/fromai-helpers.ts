/**
 * Plain $fromAI helpers (no LangChain dependency).
 *
 * Lives at a leaf so callers can import from
 * `@pong/ai-utilities/fromai-helpers` without dragging in the heavier
 * `@langchain/*` deps that the main entry pulls in.
 *
 * The LangChain `tool()` wrapper that composes these helpers
 * (`createToolFromNode`) lives in `./fromai-tool-factory.ts` and re-uses
 * the implementations here.
 */

import type { FromAIArgument, INodeParameters } from 'pong-workflow';
import { generateZodSchema, traverseNodeParameters } from 'pong-workflow';
import { z } from 'zod';

/**
 * Extracts $fromAI parameters from node parameters and returns unique arguments.
 */
export function extractFromAIParameters(nodeParameters: INodeParameters): FromAIArgument[] {
	const collectedArguments: FromAIArgument[] = [];
	traverseNodeParameters(nodeParameters, collectedArguments);

	const uniqueArgsMap = new Map<string, FromAIArgument>();
	for (const arg of collectedArguments) {
		uniqueArgsMap.set(arg.key, arg);
	}

	return Array.from(uniqueArgsMap.values());
}

/**
 * Creates a Zod schema from $fromAI arguments.
 */
export function createZodSchemaFromArgs(args: FromAIArgument[]): z.ZodObject<z.ZodRawShape> {
	const schemaObj = args.reduce((acc: Record<string, z.ZodTypeAny>, placeholder) => {
		acc[placeholder.key] = generateZodSchema(placeholder);
		return acc;
	}, {});

	return z.object(schemaObj).required();
}
