<script setup lang="ts">
import { computed, watch } from 'vue';
import { PongButton, PongPopover, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useStorage } from '@pong/composables/useStorage';
import { PONG_CHAT_HINT_DISMISSED_STORAGE_KEYS } from '../constants';
import { useAgentTelemetry, type PongChatHint } from '../composables/useAgentTelemetry';

const props = withDefaults(
	defineProps<{
		hint: PongChatHint;
		/** The caller's condition for the hint; it still never shows again once dismissed. */
		active: boolean;
		title: string;
		body: string;
		agentId?: string;
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
	}>(),
	{ agentId: undefined, side: 'bottom', align: 'start' },
);

const i18n = useI18n();
const agentTelemetry = useAgentTelemetry();
const dismissed = useStorage(PONG_CHAT_HINT_DISMISSED_STORAGE_KEYS[props.hint]);

const open = computed(() => props.active && dismissed.value !== 'true');

// Track one view for each mount. The chip hint closes and opens again with the channel modal.
let viewTracked = false;
watch(
	open,
	(isOpen) => {
		if (!isOpen || viewTracked) return;
		viewTracked = true;
		agentTelemetry.trackViewedPongChatHint({ hint: props.hint, agentId: props.agentId });
	},
	{ immediate: true },
);

// Only "Got it" dismisses. The popover's `update:open` is not wired: it reports focus
// moving anywhere else as a close, and pages autofocus inputs on load.
function dismiss() {
	if (!open.value) return;
	dismissed.value = 'true';
	agentTelemetry.trackDismissedPongChatHint({ hint: props.hint, agentId: props.agentId });
}
</script>

<template>
	<PongPopover
		:open="open"
		:side="props.side"
		:align="props.align"
		show-arrow
		:enable-scrolling="false"
		suppress-auto-focus
		width="calc(var(--spacing--5xl) + var(--spacing--3xl))"
	>
		<template #trigger><slot /></template>
		<template #content>
			<div :class="$style.hint" :data-test-id="`pong-chat-hint-${props.hint}`">
				<PongText bold size="medium" color="text-dark">{{ props.title }}</PongText>
				<PongText size="small" color="text-base">{{ props.body }}</PongText>
				<PongButton
					size="small"
					variant="outline"
					:label="i18n.baseText('agents.pongChatHint.gotIt')"
					:data-test-id="`pong-chat-hint-${props.hint}-got-it`"
					@click="dismiss"
				/>
			</div>
		</template>
	</PongPopover>
</template>

<style lang="scss" module>
.hint {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);

	button {
		margin-top: var(--spacing--3xs);
	}
}
</style>
