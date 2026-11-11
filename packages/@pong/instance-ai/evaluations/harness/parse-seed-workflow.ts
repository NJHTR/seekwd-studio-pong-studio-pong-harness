// Compile build-tool SDK code into workflow JSON for a seed. Uses
// @pong/workflow-sdk directly (resolves to built dist) rather than
// @pong/ai-workflow-builder's handler, whose `@/`-aliased source doesn't resolve
// under the eval harness's tsx runtime. Seeding only needs the JSON.

import { parseWorkflowCodeToBuilder } from '@pong/workflow-sdk';
import type { WorkflowJSON } from '@pong/workflow-sdk';

/** Matches any import statement — SDK functions are globals when parsed. */
const IMPORT_REGEX = /^\s*import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"];?\s*$/gm;

function stripImportStatements(code: string): string {
	return code
		.replace(IMPORT_REGEX, '')
		.replace(/^\s*\n/, '')
		.trim();
}

export function parseSeedWorkflowCode(code: string): { workflow: WorkflowJSON } {
	const builder = parseWorkflowCodeToBuilder(stripImportStatements(code));
	// Deterministic node ids across re-parses, matching how the builder persists.
	builder.regenerateNodeIds();
	return { workflow: builder.toJSON({ tidyUp: true }) };
}
