import type { WorkflowJSON } from '@pong/workflow-sdk';

export async function generateWorkflowSource(workflow: WorkflowJSON): Promise<string> {
	const { generateWorkflowCode, buildImports } = await import('@pong/workflow-sdk');
	// Keep node identity stable. The build restores the saved layout by node ID.
	const body = generateWorkflowCode({
		workflow,
		includeNodeIds: true,
		includePositions: false,
	});
	const imports = buildImports(body);
	return imports ? `${imports}\n\n${body}` : body;
}
