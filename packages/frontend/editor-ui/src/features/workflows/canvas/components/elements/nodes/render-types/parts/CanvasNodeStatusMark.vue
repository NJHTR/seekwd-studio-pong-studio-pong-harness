<script setup lang="ts">
import { PongIcon } from '@pong/design-system';
import type { IconSize } from '@pong/design-system';

const STATUS_ICONS = {
	success: 'node-success',
	error: 'node-execution-error',
	warning: 'node-dirty',
} as const;

const {
	status,
	iterations = 0,
	size = 'large',
} = defineProps<{
	status: keyof typeof STATUS_ICONS;
	iterations?: number;
	size?: IconSize;
}>();
</script>

<template>
	<div :class="[$style.mark, $style[status]]" :data-test-id="`canvas-node-status-mark-${status}`">
		<PongIcon :icon="STATUS_ICONS[status]" :size="size" />
		<span v-if="status !== 'error' && iterations > 1" :class="$style.count">
			{{ iterations }}
		</span>
	</div>
</template>

<style lang="scss" module>
.mark {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	font-weight: var(--font-weight--medium);
}

.success {
	color: var(--color--success);
}

.error {
	color: var(--color--danger);
}

.warning {
	color: var(--color--warning);
}

.count {
	font-size: var(--font-size--sm);
}
</style>
