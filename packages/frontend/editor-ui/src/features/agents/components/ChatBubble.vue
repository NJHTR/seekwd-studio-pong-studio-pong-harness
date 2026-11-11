<script setup lang="ts">
import { PongText } from '@pong/design-system';
import { computed } from 'vue';

const props = defineProps<{
	text?: string;
	position?: 'right' | 'left';
}>();

const positionStyle = computed(() =>
	props.position === 'left' ? 'border-bottom-left-radius: 0px' : 'border-bottom-right-radius: 0px',
);
</script>

<template>
	<div :class="$style.root" :style="positionStyle">
		<PongText color="text-dark">
			{{ text }}
			<slot></slot>
		</PongText>
	</div>
</template>

<style module lang="scss">
.root {
	background-color: var(--background--surface);
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--xl);
}
</style>
