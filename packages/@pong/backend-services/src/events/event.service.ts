import { TypedEmitter } from '@pong/backend-common';
import { Service } from '@pong/di';

/** Each event owner adds its payload types through module augmentation. */
export interface EventMap {}

@Service()
export class EventService extends TypedEmitter<EventMap> {}
