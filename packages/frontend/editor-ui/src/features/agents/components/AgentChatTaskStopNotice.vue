<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { PongButton, PongIcon, PongLink } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import type { AgentTaskStopNotice } from '../composables/useAgentChatTaskControls';

defineProps<{
	status: AgentTaskStopNotice;
	retryDisabled: boolean;
	traceRoute?: RouteLocationRaw;
}>();

const emit = defineEmits<{ retry: [event: MouseEvent] }>();
const locale = useI18n();
</script>

<template>
	<div
		:class="$style.stopNotice"
		role="status"
		aria-live="polite"
		data-testid="agent-task-stop-status"
	>
		<PongIcon
			v-if="status === 'stopping' || status === 'preparing'"
			icon="loader-circle"
			spin
			size="small"
			aria-hidden="true"
		/>
		<div>
			<p>{{ locale.baseText(`agents.chat.tasks.inline.${status}`) }}</p>
			<p v-if="status === 'stopping'">
				{{ locale.baseText('agents.chat.tasks.inline.wait') }}
			</p>
			<PongButton
				v-if="status === 'failed'"
				variant="ghost"
				size="small"
				:disabled="retryDisabled"
				@click="emit('retry', $event)"
			>
				{{ locale.baseText('agents.chat.tasks.retry') }}
			</PongButton>
			<PongLink v-if="traceRoute" :to="traceRoute" theme="text" size="small" underline>
				{{ locale.baseText('agents.chat.plan.viewTrace') }}
			</PongLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.stopNotice {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);

	p {
		margin: 0;
	}
}
</style>
