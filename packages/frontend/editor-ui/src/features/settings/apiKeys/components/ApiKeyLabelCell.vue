<script lang="ts" setup>
import { ref } from 'vue';
import { useElementOverflow } from '@pong/composables/useElementOverflow';
import { PongText, PongTooltip } from '@pong/design-system';

const props = defineProps<{
	label: string;
	apiKey: string;
}>();

const labelEl = ref<HTMLElement | null>(null);
const { isOverflowing } = useElementOverflow(labelEl, 'x', [() => props.label]);
</script>

<template>
	<div :class="$style.cell">
		<PongTooltip
			:content="label"
			:show-after="500"
			:disabled="!isOverflowing"
			:content-class="$style.tooltip"
		>
			<span ref="labelEl" :class="$style.label">
				<PongText bold>{{ label }}</PongText>
			</span>
		</PongTooltip>
		<PongText size="small" color="text-light" :class="$style.redacted">
			{{ apiKey }}
		</PongText>
	</div>
</template>

<style lang="scss" module>
.cell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.label {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.redacted {
	font-family: var(--font-family--monospace);
}

:global(.pong-tooltip).tooltip {
	max-width: none;
	white-space: nowrap;
}
</style>
