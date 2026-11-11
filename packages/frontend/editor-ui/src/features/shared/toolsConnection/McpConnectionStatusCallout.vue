<script setup lang="ts">
import { computed } from 'vue';
import { PongButton, PongCallout } from '@pong/design-system';
import { useI18n, type BaseTextKey } from '@pong/i18n';

import type { ToolConnectionFailureReason } from './types';

const props = defineProps<{
	failureReason?: ToolConnectionFailureReason;
}>();

const emit = defineEmits<{
	reconnect: [];
	retry: [];
}>();

const i18n = useI18n();
const failureMessageKey = computed<BaseTextKey>(() => {
	switch (props.failureReason) {
		case 'authentication':
			return 'tools.connection.failure.authentication';
		case 'server_unavailable':
			return 'tools.connection.failure.serverUnavailable';
		default:
			return 'tools.connection.failure.unknown';
	}
});
const recoveryActionKey = computed<BaseTextKey>(() =>
	props.failureReason === 'authentication' ? 'tools.connection.action.reconnect' : 'generic.retry',
);

function recover() {
	if (props.failureReason === 'authentication') emit('reconnect');
	else emit('retry');
}
</script>

<template>
	<PongCallout theme="danger" data-test-id="tools-connection-failure">
		{{ i18n.baseText(failureMessageKey) }}
		<template #actions>
			<PongButton
				variant="ghost"
				size="small"
				data-test-id="tools-connection-recovery"
				@click="recover"
			>
				{{ i18n.baseText(recoveryActionKey) }}
			</PongButton>
		</template>
	</PongCallout>
</template>
