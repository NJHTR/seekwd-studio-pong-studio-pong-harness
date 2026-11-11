<script lang="ts" setup>
import { useI18n } from '@pong/i18n';

import { PongIcon, PongText, PongTooltip } from '@pong/design-system';
const emit = defineEmits<{
	'update:modelValue': [feedback: 'positive' | 'negative'];
}>();

defineProps<{
	modelValue?: 'positive' | 'negative';
}>();

const i18n = useI18n();

function onFeedback(feedback: 'positive' | 'negative') {
	emit('update:modelValue', feedback);
}
</script>
<template>
	<div class="feedback">
		<PongText v-if="!modelValue" class="mr-2xs">
			{{ i18n.baseText('feedback.title') }}
		</PongText>
		<PongText v-else :color="modelValue === 'positive' ? 'success' : 'danger'">
			<PongIcon :icon="modelValue === 'positive' ? 'thumbs-up' : 'thumbs-down'" class="mr-2xs" />
			{{ i18n.baseText(`feedback.${modelValue}`) }}
		</PongText>
		<PongTooltip v-if="!modelValue" :content="i18n.baseText('feedback.positive')">
			<span
				class="feedback-button"
				data-test-id="feedback-button-positive"
				@click="onFeedback('positive')"
			>
				<PongIcon icon="thumbs-up" />
			</span>
		</PongTooltip>
		<PongTooltip v-if="!modelValue" :content="i18n.baseText('feedback.negative')">
			<span
				class="feedback-button"
				data-test-id="feedback-button-negative"
				@click="onFeedback('negative')"
			>
				<PongIcon icon="thumbs-down" />
			</span>
		</PongTooltip>
	</div>
</template>

<style lang="scss">
.feedback {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);

	.feedback-button {
		cursor: pointer;
		width: var(--spacing--lg);
		height: var(--spacing--lg);
		color: var(--color--text--tint-1);
		display: flex;
		justify-content: center;
		align-items: center;

		&:hover {
			color: var(--color--primary);
		}
	}
}
</style>
