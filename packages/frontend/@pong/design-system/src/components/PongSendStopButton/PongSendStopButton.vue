<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import PongButton from '../PongButton';

const { t } = useI18n();

export interface PongSendStopButtonProps {
	streaming?: boolean;
	disabled?: boolean;
	size?: 'mini' | 'small' | 'medium' | 'large';
	label?: string;
	sendButtonTestId?: string;
	stopButtonTestId?: string;
}

withDefaults(defineProps<PongSendStopButtonProps>(), {
	streaming: false,
	disabled: false,
	size: 'medium',
	label: undefined,
	sendButtonTestId: 'send-message-button',
	stopButtonTestId: 'send-message-button',
});

const emit = defineEmits<{
	send: [];
	stop: [];
}>();

function handleSend() {
	emit('send');
}

function handleStop() {
	emit('stop');
}
</script>

<template>
	<PongButton
		v-if="streaming"
		variant="brand"
		icon-only
		:aria-label="t('sendStopButton.stop')"
		:size="size"
		icon="filled-square"
		icon-size="medium"
		:data-test-id="stopButtonTestId"
		@click="handleStop"
	/>
	<PongButton
		v-else
		variant="brand"
		:size="size"
		:icon-only="!label"
		icon-size="medium"
		:icon="label ? undefined : 'arrow-up'"
		:aria-label="label ? undefined : t('sendStopButton.send')"
		:disabled="disabled"
		:data-test-id="sendButtonTestId"
		@click="handleSend"
	>
		{{ label }}
	</PongButton>
</template>
