import type { CanvasEventBusEvents } from './canvas.types';
import { createEventBus } from '@pong/utils/event-bus';

export const canvasEventBus = createEventBus<CanvasEventBusEvents>();
