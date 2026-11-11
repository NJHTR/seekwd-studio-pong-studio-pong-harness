import { useUsersStore } from '@pong/stores/users.store';
import type { DefaultUserMiddlewareOptions, RBACPermissionCheck } from '@/app/types/rbac';

export const isInstanceOwner: RBACPermissionCheck<DefaultUserMiddlewareOptions> = () =>
	useUsersStore().isInstanceOwner;
