import { assignableProjectRoleSchema } from '@pong/permissions';

import { Z } from '../../zod-class';

export class ChangeUserRoleInProject extends Z.class({
	role: assignableProjectRoleSchema,
}) {}
