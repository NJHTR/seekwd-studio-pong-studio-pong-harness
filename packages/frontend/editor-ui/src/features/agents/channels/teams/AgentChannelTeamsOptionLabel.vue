<script setup lang="ts">
import { PongText } from '@pong/design-system';

defineProps<{ label: string; description?: string; disabled?: boolean }>();
</script>

<template>
	<span :class="$style.option">
		<PongText size="small" bold :color="disabled ? 'text-xlight' : 'text-dark'">{{ label }}</PongText>
		<PongText v-if="description" size="xsmall" :color="disabled ? 'text-xlight' : 'text-light'">
			{{ description }}
		</PongText>
	</span>
</template>

<style module lang="scss">
.option {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	max-width: 260px;
	padding: var(--spacing--4xs) 0;
	white-space: normal;
	line-height: var(--line-height--md);
}
</style>
