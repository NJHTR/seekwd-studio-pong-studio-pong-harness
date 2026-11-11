<script setup lang="ts">
import { useAttrs } from 'vue';
import { type IconName } from '@pong/design-system';

import { PongIcon, PongTooltip } from '@pong/design-system';
defineProps<{ label: string; icon: IconName; placement: 'left' | 'right' | 'top' | 'bottom' }>();

const attrs = useAttrs();

const onClick = () => {
	// @ts-expect-error Attrs onClick is not typed
	attrs.onClick?.();
};
</script>

<template>
	<div :class="$style.container">
		<PongTooltip :placement="placement">
			<template #content>
				{{ label }}
			</template>
			<PongIcon :class="$style.icon" :icon="icon" size="xsmall" @click="onClick" />
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
	cursor: pointer;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
