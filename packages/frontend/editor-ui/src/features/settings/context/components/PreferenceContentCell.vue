<script lang="ts" setup>
import { ref } from 'vue';
import { useElementOverflow } from '@pong/composables/useElementOverflow';
import { PongTooltip } from '@pong/design-system';

/** Two-line clamp. The tooltip renders through a slot, so user text is never parsed as HTML. */
const props = defineProps<{
	content: string;
}>();

const textEl = ref<HTMLElement | null>(null);
const { isOverflowing: isClamped } = useElementOverflow(textEl, 'y', [() => props.content]);
</script>

<template>
	<PongTooltip
		:show-after="500"
		:disabled="!isClamped"
		placement="top"
		:content-class="$style.tooltip"
	>
		<template #content>
			<span :class="$style.full">{{ content }}</span>
		</template>
		<span ref="textEl" :class="$style.text" data-test-id="preference-content">{{ content }}</span>
	</PongTooltip>
</template>

<style lang="scss" module>
// Line clamping needs the text element itself, not a wrapper.
.text {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	white-space: normal;
	overflow-wrap: anywhere;
}

:global(.pong-tooltip).tooltip {
	max-width: 480px;
}

.full {
	white-space: pre-line;
	overflow-wrap: anywhere;
}
</style>
