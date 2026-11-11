<script lang="ts" setup>
import { PongButton, type ButtonProps } from '@pong/design-system';

export type Props = Pick<ButtonProps, 'label' | 'variant'>;

defineProps<Props>();
</script>
<template>
	<PongButton
		:label="label"
		size="large"
		icon="message-circle"
		:variant="variant"
		data-test-id="workflow-chat-button"
	/>
</template>
