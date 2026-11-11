<script setup lang="ts">
import type { PropType } from 'vue';

import { PongIcon, PongTooltip } from '@pong/design-system';
defineProps({
	placement: {
		type: String as PropType<'left' | 'right' | 'top' | 'bottom'>,
		default: 'top',
	},
});
</script>

<template>
	<div :class="$style.container">
		<PongTooltip :placement="placement">
			<template #content>
				<slot />
			</template>
			<span :class="$style.icon">
				<PongIcon icon="info" size="xsmall" />
			</span>
		</PongTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: inline-flex;
	align-items: center;
	margin: 0 var(--spacing--4xs);
}

.icon {
	color: var(--color--text--tint-1);
	cursor: help;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
