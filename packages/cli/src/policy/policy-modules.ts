import type { ModuleName } from '@pong/backend-common';

/** The modules that register the policy implementation and its checks. */
export const POLICY_MODULES: ModuleName[] = ['policy-infrastructure', 'type-availability-policies'];
