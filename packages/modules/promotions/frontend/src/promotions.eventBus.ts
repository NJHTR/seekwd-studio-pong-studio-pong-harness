import type { Project } from '@pong/rest-api-client';
import { createEventBus } from '@pong/utils/event-bus';

export interface PromotionEventBusEvents {
	applied: { projectId: string; project?: Project };
	promoted: { projectId: string };
	projectRemoved: { projectId: string };
}

export const promotionEventBus = createEventBus<PromotionEventBusEvents>();
