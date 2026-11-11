import { policyViolationSchema, type PolicyViolation } from '@pong/api-types';
import { isRecord } from '@pong/utils/is-record';

const violationsSchema = policyViolationSchema.array().nonempty();

/**
 * A refused request carries the violations under `meta`, but a refused manual run is stored on
 * the execution error, where only the own properties of the error survive.
 */
function readViolations(error: unknown): unknown {
	if (!isRecord(error)) return undefined;
	if (isRecord(error.meta) && error.meta.violations !== undefined) return error.meta.violations;
	return error.violations;
}

export function getPolicyViolations(error: unknown): PolicyViolation[] | undefined {
	const parsed = violationsSchema.safeParse(readViolations(error));
	return parsed.success ? parsed.data : undefined;
}
