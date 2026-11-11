import { type WorkflowEntity, WithCreatedAt } from '@pong/db';
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from '@pong/typeorm';

import type { Agent } from './agent.entity';

@Entity({ name: 'agent_workflow_dependency' })
export class AgentWorkflowDependency extends WithCreatedAt {
	@PrimaryColumn({ type: 'varchar', length: 36 })
	agentId: string;

	@ManyToOne('Agent', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Relation<Agent>;

	@Index()
	@PrimaryColumn({ type: 'varchar', length: 36 })
	workflowId: string;

	@ManyToOne('WorkflowEntity', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'workflowId' })
	workflow: Relation<WorkflowEntity>;
}
