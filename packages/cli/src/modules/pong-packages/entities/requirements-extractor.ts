import type { WorkflowEntity } from '@pong/db';

export interface RequirementsExtractor<TRequirement> {
	extract(workflow: WorkflowEntity): TRequirement[];
}
