<script lang="ts" setup>
import { PongHeading } from '@pong/design-system';

defineProps<{
	title: string;
}>();
</script>

<template>
	<div :class="$style.block">
		<div :class="$style.header">
			<PongHeading tag="h3" size="small" color="text-base">{{ title }}</PongHeading>
		</div>
		<div :class="$style.content">
			<slot></slot>
		</div>
	</div>
</template>

<style lang="scss" module>
.block {
	padding-bottom: var(--spacing--xl);
}

.header {
	padding: 0 0 var(--spacing--4xs);
	border-bottom: var(--border);
}

.content {
	padding: var(--spacing--xs) 0 0;
}
</style>
