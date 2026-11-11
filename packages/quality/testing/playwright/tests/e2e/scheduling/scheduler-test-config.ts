export const durableScheduleTestConfig = {
	capability: {
		env: {
			PONG_SCHEDULER_ENABLED: 'true',
			PONG_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			PONG_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
} as const;

export const migratedPollTestConfig = {
	capability: {
		services: ['proxy'],
		env: {
			PONG_POLLER_DURABLE_CURSORS_ENABLED: 'true',
			PONG_SCHEDULER_ENABLED: 'true',
			PONG_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			PONG_SCHEDULER_POLL_TRIGGERS_ENABLED: 'true',
			PONG_SCHEDULER_MATERIALIZATION_INTERVAL: '1',
			PONG_SCHEDULER_EXECUTOR_INTERVAL: '1',
		},
	},
} as const;
