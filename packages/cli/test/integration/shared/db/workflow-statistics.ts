import { StatisticsNames, type WorkflowStatistics } from '@pong/db';
import { WorkflowStatisticsRepository } from '@pong/db';
import { Container } from '@pong/di';
import type { Workflow } from 'pong-workflow';

export async function createWorkflowStatisticsItem(
	workflowId: Workflow['id'],
	data?: Partial<WorkflowStatistics>,
) {
	const entity = Container.get(WorkflowStatisticsRepository).create({
		count: 0,
		latestEvent: new Date().toISOString(),
		name: StatisticsNames.manualSuccess,
		...(data ?? {}),
		workflowId,
	});

	await Container.get(WorkflowStatisticsRepository).insert(entity);

	return entity;
}
