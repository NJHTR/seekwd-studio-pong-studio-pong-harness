<script lang="ts" setup>
import { useCanvasNode } from '../../../../../composables/useCanvasNode';
import { computed } from 'vue';
import type { CanvasNodeDefaultRender } from '../../../../../canvas.types';

import { PongTooltip } from '@pong/design-system';
defineProps<{
	visible: boolean;
}>();

const { render } = useCanvasNode();

const renderOptions = computed(() => render.value.options as CanvasNodeDefaultRender['options']);
</script>

<template>
	<div :class="$style.tooltipAnchor">
		<PongTooltip
			placement="top"
			:show-after="500"
			:visible="visible"
			:teleported="false"
			:content-class="$style.content"
			:avoid-collisions="false"
		>
			<template #content>
				{{ renderOptions.tooltip }}
			</template>
			<span :class="$style.tooltipTrigger" />
		</PongTooltip>
	</div>
</template>

<style lang="scss" module>
.tooltipAnchor {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	display: flex;
	justify-content: center;
	pointer-events: none;
}

.content {
	white-space: nowrap;
	max-width: none;
}
</style>
