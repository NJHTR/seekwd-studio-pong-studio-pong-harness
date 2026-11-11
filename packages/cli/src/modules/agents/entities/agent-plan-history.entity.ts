import { DateTimeColumn, JsonColumn, WithCreatedAt } from '@pong/db';
import {
	Check,
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
} from '@pong/typeorm';
import type { JsonObject } from 'pong-workflow';

import type { AgentPlan } from './agent-plan.entity';

@Entity({ name: 'agent_plan_history' })
@Check('"revision" > 0')
@Check('"formatVersion" > 0')
export class AgentPlanHistory extends WithCreatedAt {
	@PrimaryColumn({ type: 'uuid', comment: 'Plan that owns this snapshot' })
	planId: string;

	@ManyToOne('AgentPlan', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'planId' })
	plan: Relation<AgentPlan>;

	@PrimaryColumn({ type: 'int', comment: 'Document revision captured by this snapshot' })
	revision: number;

	@Column({ type: 'int', comment: 'Version of the snapshot JSON format' })
	formatVersion: number;

	@JsonColumn({ comment: 'Complete plan document after this change' })
	data: JsonObject;

	@DateTimeColumn({ precision: 3, nullable: true, comment: 'Plan closure time at this revision' })
	closedAt: Date | null;
}
