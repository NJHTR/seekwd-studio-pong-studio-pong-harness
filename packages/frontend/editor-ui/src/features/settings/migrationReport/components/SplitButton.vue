<script lang="ts" setup>
import { PongActionToggle, PongButton, PongIconButton } from '@pong/design-system';

type Action = {
	label: string;
	value: string;
	disabled?: boolean;
};

type Props = {
	label: string;
	// Names the icon-only toggle for screen readers.
	toggleLabel: string;
	// Also disables the menu, so the bar shows one state for the whole button.
	disabled?: boolean;
	// More actions in the chevron menu.
	actions: Action[];
};

defineOptions({ inheritAttrs: false });

defineProps<Props>();

const emit = defineEmits<{
	click: [];
	action: [value: string];
}>();
</script>

<template>
	<div :class="$style.group">
		<PongButton
			variant="outline"
			:label="label"
			:disabled="disabled"
			:class="$style.main"
			v-bind="$attrs"
			@click="emit('click')"
		/>
		<PongActionToggle
			:actions="actions"
			:disabled="disabled"
			placement="bottom-end"
			@action="emit('action', $event)"
		>
			<PongIconButton
				variant="outline"
				icon="chevron-down"
				:aria-label="toggleLabel"
				:disabled="disabled"
				:class="$style.toggle"
				data-test-id="split-button-toggle"
			/>
		</PongActionToggle>
	</div>
</template>

<style lang="scss" module>
.group {
	display: inline-flex;
	border: 1px solid var(--border-color);
	border-radius: var(--radius--full);

	.main,
	.toggle {
		--button--border--shadow: 0 0 0 0 transparent;
		--button--border--shadow--hover: 0 0 0 0 transparent;
		--button--border--shadow--active: 0 0 0 0 transparent;
	}

	.main {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.toggle {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		border-left: 1px solid var(--border-color);
	}
}
</style>
