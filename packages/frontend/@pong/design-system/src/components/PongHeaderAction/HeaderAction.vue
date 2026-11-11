<script setup lang="ts">
import { TOOLTIP_DELAY_MS } from '../../constants';
import type { IconName } from '../PongIcon/icons';
import PongIconButton from '../PongIconButton/IconButton.vue';
import PongTooltip from '../PongTooltip/Tooltip.vue';

export interface Props {
	/**
	 * The icon to display
	 */
	icon: IconName;
	/**
	 * Accessible label for the button
	 */
	label: string;
	/**
	 * Optional tooltip text (if not provided, no tooltip is shown)
	 */
	tooltip?: string;
	/**
	 * Whether this is a danger action (e.g., delete)
	 */
	danger?: boolean;
	/**
	 * Test ID for the button
	 */
	testId?: string;
}

withDefaults(defineProps<Props>(), {
	tooltip: undefined,
	danger: false,
	testId: undefined,
});

const emit = defineEmits<{
	click: [event: MouseEvent];
}>();
</script>

<template>
	<PongTooltip as-child :disabled="!tooltip" :show-after="TOOLTIP_DELAY_MS">
		<template #content>{{ tooltip || label }}</template>
		<PongIconButton
			variant="ghost"
			size="small"
			icon-size="large"
			:icon="icon"
			:aria-label="label"
			:data-test-id="testId"
			:class="danger ? $style.dangerAction : undefined"
			v-bind="$attrs"
			@click="emit('click', $event)"
		/>
	</PongTooltip>
</template>

<style lang="scss" module>
.dangerAction {
	&:hover {
		--button--color--text--hover: var(--color--danger);
	}
}
</style>
