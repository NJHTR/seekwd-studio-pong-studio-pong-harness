import type { AgentEvalVote } from '@pong/api-types';
import { Column, Entity, Index, ManyToOne } from '@pong/typeorm';
import type { JsonObject } from 'pong-workflow';

import { JsonColumn, WithTimestampsAndStringId } from './abstract-entity';
import { AgentEvalResult } from './agent-eval-result.ee';

// The FE/BE contract for this union lives in `@pong/api-types`; re-exported so
// existing db-internal consumers keep importing it from the entity.
export type { AgentEvalVote };

/**
 * A human's rating of an {@link AgentEvalResult}: a 👍/👎 vote plus an optional
 * correction (an edited "should have been" output) and free-text comment.
 * Multiple ratings per result are allowed (per-user history); `ratedById` is a
 * plain FK column (see {@link AgentEvalDataset} for the no-decorator rationale).
 */
@Entity({ name: 'agent_eval_rating' })
export class AgentEvalRating extends WithTimestampsAndStringId {
	@Index()
	@Column('varchar', { length: 36 })
	resultId: string;

	@ManyToOne('AgentEvalResult', { onDelete: 'CASCADE' })
	result: AgentEvalResult;

	@Column('varchar', { length: 8 })
	vote: AgentEvalVote;

	@Column('text', { nullable: true })
	comment: string | null;

	@JsonColumn({ nullable: true })
	correction: JsonObject | null;

	@Column({ type: 'uuid', nullable: true })
	ratedById: string | null;
}
