import type { PolicyViolation } from '@pong/api-types';
import { getPolicyViolations } from '@pong/frontend-module-type-availability-policies';
import { hasPolicyRefusalMarker } from 'pong-workflow';

export interface ToolPolicyRefusal {
	violations: [PolicyViolation, ...PolicyViolation[]];
}

/** A tool output in the serialized policy-refusal shape, the one executions also store. */
export function parseToolPolicyRefusal(output: unknown): ToolPolicyRefusal | undefined {
	if (!hasPolicyRefusalMarker(output)) return undefined;
	const [first, ...rest] = getPolicyViolations(output) ?? [];
	return first ? { violations: [first, ...rest] } : undefined;
}

export function isPolicyRefusedToolOutput(output: unknown): boolean {
	return parseToolPolicyRefusal(output) !== undefined;
}
