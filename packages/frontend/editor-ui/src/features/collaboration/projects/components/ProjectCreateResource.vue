<script lang="ts" setup>
import type { ButtonVariant, UserAction } from '@pong/design-system';
import type { IUser } from 'pong-workflow';
import { useTemplateRef } from 'vue';

import { PongActionToggle, PongIconButton } from '@pong/design-system';

defineProps<{
	actions: Array<UserAction<IUser>>;
	disabled?: boolean;
	variant?: ButtonVariant;
}>();

const emit = defineEmits<{
	action: [id: string];
}>();

const actionToggleRef = useTemplateRef('actionToggleRef');

defineExpose({
	openActionToggle: (isOpen: boolean) => actionToggleRef.value?.openActionToggle(isOpen),
});
</script>

<template>
	<div :class="[$style.buttonGroup]">
		<slot></slot>
		<PongActionToggle
			ref="actionToggleRef"
			data-test-id="add-resource"
			:actions="actions"
			placement="bottom-end"
			:teleported="false"
			@action="emit('action', $event)"
		>
			<PongIconButton
				:disabled="disabled"
				:class="[$style.buttonGroupDropdown]"
				icon="chevron-down"
				:variant="variant ?? 'solid'"
			/>
		</PongActionToggle>
	</div>
</template>

<style lang="scss" module>
.buttonGroup {
	display: inline-flex;

	:global(> .button) {
		&:not(:first-child) {
			border-radius: 0;
		}

		&:first-child {
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
			/** Accounts for optical alignment as right side isn't rounded so looks bigger **/
			padding-inline-start: var(--spacing--sm);
		}
	}
}

.buttonGroupDropdown {
	border-left: 1px solid var(--color--black-alpha-100);
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;

	/** Offset this icon as button is rounded so some icons optically look mis-aligned when centered **/
	:global(.pong-icon) {
		transform: translateX(-2px);
	}
}
</style>
