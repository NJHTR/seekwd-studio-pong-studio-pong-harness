import type { AgentPlanTaskRef } from '@pong/api-types';
import { z } from 'zod';

export const PLAN_TASK_METADATA_KEY = 'pongPlanTask';
const planTaskSchema = z.object({ planId: z.string().uuid(), planTaskId: z.string().uuid() });

/** Read only host metadata. Model input must pass plan validation first. */
export function readPlanTaskContext(
	metadata?: Record<string, unknown>,
): AgentPlanTaskRef | undefined {
	const result = planTaskSchema.safeParse(metadata?.[PLAN_TASK_METADATA_KEY]);

	return result.success ? result.data : undefined;
}
