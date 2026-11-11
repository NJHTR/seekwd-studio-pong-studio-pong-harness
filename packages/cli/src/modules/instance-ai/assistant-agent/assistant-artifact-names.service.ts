import { DataTableRepository } from '@pong/backend-module-data-table';
import { WorkflowRepository } from '@pong/db';
import { Service } from '@pong/di';
import type { InstanceAiChangedArtifact } from '@pong/instance-ai';

/** Looks up the current names of the artifacts that the Assistant shows as tabs. */
@Service()
export class AssistantArtifactNamesService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly dataTableRepository: DataTableRepository,
	) {}

	/** The current name of the artifact. A rename can make the name the tool knows stale. */
	async withCurrentName(artifact: InstanceAiChangedArtifact): Promise<InstanceAiChangedArtifact> {
		if (artifact.type === 'workflow') {
			const [workflow] = await this.workflowRepository.findByIds([artifact.id], {
				fields: ['name'],
			});
			return workflow ? { ...artifact, name: workflow.name } : artifact;
		}
		if (artifact.type === 'data-table') {
			const [table] = await this.dataTableRepository.findSummariesByIds([artifact.id]);
			return table ? { ...artifact, name: table.name, projectId: table.projectId } : artifact;
		}
		return artifact;
	}
}
