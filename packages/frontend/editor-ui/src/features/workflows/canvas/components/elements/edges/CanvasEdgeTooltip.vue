<script lang="ts" setup>
import { useCssModule } from 'vue';
import { PongTooltip } from '@pong/design-system';

defineProps<{
	content: string;
}>();

const $style = useCssModule();
</script>

<template>
	<div :class="$style.tooltipContainer">
		<PongTooltip
			:content="content"
			placement="top"
			:teleported="false"
			:offset="8"
			:content-class="$style.content"
		>
			<slot />
		</PongTooltip>
	</div>
</template>

<style lang="scss" module>
.tooltipContainer {
	position: relative;
}

.content {
	white-space: nowrap;
}
</style>
