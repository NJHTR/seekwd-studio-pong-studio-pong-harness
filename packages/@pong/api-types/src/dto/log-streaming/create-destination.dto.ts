import {
	MessageEventBusDestinationSentryOptionsSchema,
	MessageEventBusDestinationSyslogOptionsSchema,
	MessageEventBusDestinationWebhookOptionsSchema,
} from 'pong-workflow';
import { z } from 'zod';

// Union of all destination types - discriminated union based on __type field
export const CreateDestinationDto = z.discriminatedUnion('__type', [
	MessageEventBusDestinationWebhookOptionsSchema,
	MessageEventBusDestinationSentryOptionsSchema,
	MessageEventBusDestinationSyslogOptionsSchema,
]);

// Type exports for use in other files - re-export from workflow package
export type {
	MessageEventBusDestinationWebhookOptions as WebhookDestination,
	MessageEventBusDestinationSentryOptions as SentryDestination,
	MessageEventBusDestinationSyslogOptions as SyslogDestination,
} from 'pong-workflow';
