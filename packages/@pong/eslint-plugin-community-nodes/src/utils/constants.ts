import type { WebhookSetupMethodNames } from 'pong-workflow';

export type WebhookLifecycleMethod = WebhookSetupMethodNames;

/**
 * pong's canonical webhook lifecycle method names (`WebhookSetupMethodNames`) are
 * a type, so they can't be iterated at lint time. This object mirrors them as a
 * runtime value; the `satisfies Record<WebhookSetupMethodNames, true>` ties it to
 * the source of truth — adding, removing, or renaming a method upstream breaks
 * type-checking here until this list is updated.
 */
const LIFECYCLE_METHOD_SET = {
	checkExists: true,
	create: true,
	delete: true,
} as const satisfies Record<WebhookSetupMethodNames, true>;

/** The webhook trigger lifecycle methods, in the order pong invokes them. */
export const WEBHOOK_LIFECYCLE_METHODS = Object.keys(
	LIFECYCLE_METHOD_SET,
) as readonly WebhookLifecycleMethod[];
