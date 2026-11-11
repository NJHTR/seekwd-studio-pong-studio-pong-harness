import { EventService } from '@pong/backend-services';
import { AuthenticatedRequest } from '@pong/db';
import { Get, RestController } from '@pong/decorators';

/** This controller holds endpoints that the frontend uses to trigger telemetry events */
@RestController('/events')
export class EventsController {
	constructor(private readonly eventService: EventService) {}

	@Get('/session-started')
	sessionStarted(req: AuthenticatedRequest) {
		const pushRef = req.headers['push-ref'];
		this.eventService.emit('session-started', { pushRef });
	}
}
