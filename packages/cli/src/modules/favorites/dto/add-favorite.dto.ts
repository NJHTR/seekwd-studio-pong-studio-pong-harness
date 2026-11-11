import { Z, FAVORITE_RESOURCE_TYPES } from '@pong/api-types';
import { z } from 'zod';

export class AddFavoriteDto extends Z.class({
	resourceId: z.string(),
	resourceType: z.enum(FAVORITE_RESOURCE_TYPES),
}) {}
