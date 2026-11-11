<script setup lang="ts">
import { PongText } from '@pong/design-system';

defineProps<{
	text: string;
}>();
</script>

<template>
	<li :class="$style.emptyState">
		<PongText color="text-base" size="small">{{ text }}</PongText>
	</li>
</template>

<style module lang="scss">
.emptyState {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: var(--spacing--md) var(--spacing--xs);
}
</style>
