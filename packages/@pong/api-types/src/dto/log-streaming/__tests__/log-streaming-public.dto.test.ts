import {
	LogStreamingDestinationPublicDto,
	LogStreamingEventTypesPublicDto,
	UpdateLogStreamingDestinationPublicDto,
} from '../log-streaming-public.dto';

describe('LogStreamingEventTypesPublicDto', () => {
	test('accepts a list of event names', () => {
		const result = LogStreamingEventTypesPublicDto.safeParse({
			data: ['pong.workflow.started', 'pong.workflow.success', 'pong.workflow.failed'],
		});

		expect(result.success).toBe(true);
	});

	test('accepts an empty list', () => {
		expect(LogStreamingEventTypesPublicDto.safeParse({ data: [] }).success).toBe(true);
	});

	test.each([
		['a missing data field', {}],
		['a string instead of the array', { data: 'pong.workflow.started' }],
		['a non-string event name', { data: [1] }],
	])('rejects %s', (_, input) => {
		expect(LogStreamingEventTypesPublicDto.safeParse(input).success).toBe(false);
	});
});

const webhook = {
	id: '88be6560-bfb4-455c-8aa1-06971e9e5522',
	type: 'webhook',
	label: 'My destination',
	enabled: true,
	subscribedEvents: ['pong.workflow'],
	url: 'https://example.com/pong-events',
};

describe('LogStreamingDestinationPublicDto', () => {
	test.each([
		['a missing id', { ...webhook, id: undefined }],
		['an unknown type', { ...webhook, type: 'kafka' }],
	])('rejects %s', (_, input) => {
		expect(LogStreamingDestinationPublicDto.safeParse(input).success).toBe(false);
	});

	test.each([
		['webhook URL', { ...webhook, url: 'ftp://example.com/pong-events' }],
		['syslog host', { ...webhook, url: undefined, type: 'syslog', host: '127.1' }],
	])('returns a stored %s that the request checks reject', (_, input) => {
		expect(LogStreamingDestinationPublicDto.safeParse(input).success).toBe(true);
		expect(UpdateLogStreamingDestinationPublicDto.safeParse(input).success).toBe(false);
	});
});
