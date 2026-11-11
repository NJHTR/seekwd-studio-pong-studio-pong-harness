import { pongIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';

export class GetWorkflowReviewEligibleReviewersQueryDto extends Z.class({
	workflowId: pongIdSchema,
}) {}
