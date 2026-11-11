<script setup lang="ts">
import { PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

defineProps<{
	value: string;
	max: number;
	showWhenEmpty?: boolean;
}>();

const i18n = useI18n();
</script>

<template>
	<PongText
		v-if="value || showWhenEmpty"
		size="xsmall"
		color="text-light"
		:class="$style.characterCount"
	>
		{{
			i18n.baseText('generic.characterCount', {
				interpolate: { count: String(value.length), max: String(max) },
			})
		}}
	</PongText>
</template>

<style lang="scss" module>
.characterCount {
	display: flex;
	justify-content: flex-end;
	margin-top: var(--spacing--2xs);
}
</style>
