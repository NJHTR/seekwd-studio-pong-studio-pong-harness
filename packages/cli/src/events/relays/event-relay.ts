import { EventService } from '@pong/backend-services';
import { Service } from '@pong/di';

import type { RelayEventMap } from '@/events/maps/relay.event-map';

@Service()
export class EventRelay {
	constructor(readonly eventService: EventService) {}

	protected setupListeners<EventNames extends keyof RelayEventMap>(
		map: {
			[EventName in EventNames]?: (event: RelayEventMap[EventName]) => void | Promise<void>;
		},
	) {
		for (const [eventName, handler] of Object.entries(map) as Array<
			[EventNames, (event: RelayEventMap[EventNames]) => void | Promise<void>]
		>) {
			this.eventService.on(eventName, async (event) => {
				await handler(event);
			});
		}
	}
}
