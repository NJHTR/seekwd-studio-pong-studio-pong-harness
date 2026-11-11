import { z } from 'zod';

import { pongIdSchema } from '../../schemas/id.schema';
import {
	requiredWorkflowVersionNameSchema,
	workflowVersionDescriptionSchema,
} from '../../schemas/workflow-version.schema';
import { Z } from '../../zod-class';

export class UpdateWorkflowReviewRequestVersionDto extends Z.class({
	workflowId: pongIdSchema,
	workflowVersionId: pongIdSchema,
	workflowVersionName: requiredWorkflowVersionNameSchema,
	// When present, an empty/whitespace string clears the version description
	workflowVersionDescription: workflowVersionDescriptionSchema,
	// When present, an empty/whitespace string clears the review description
	description: z.string().max(512).optional(),
}) {}
