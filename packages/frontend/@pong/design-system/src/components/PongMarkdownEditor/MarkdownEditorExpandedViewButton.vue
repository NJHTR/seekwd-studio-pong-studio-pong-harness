<script setup lang="ts">
import { computed } from 'vue';

import { t } from '../../locale';
import type { ButtonVariant } from '../../types/button';
import type { IconSize } from '../../types/icon';
import PongIconButton from '../PongIconButton';
import PongTooltip from '../PongTooltip';

const props = withDefaults(
	defineProps<{
		isExpandedView?: boolean;
		variant?: ButtonVariant;
		iconSize?: IconSize;
	}>(),
	{
		isExpandedView: false,
		variant: 'ghost',
		iconSize: 'small',
	},
);

const emit = defineEmits<{
	toggle: [];
}>();

const label = computed(function getLabel() {
	return t(
		props.isExpandedView ? 'markdownEditor.closeExpandedView' : 'markdownEditor.openExpandedView',
		undefined,
	);
});
</script>

<template>
	<PongTooltip :content="label">
		<PongIconButton
			:icon="isExpandedView ? 'x' : 'maximize-2'"
			:variant="variant"
			size="small"
			:icon-size="iconSize"
			:aria-label="label"
			@click="emit('toggle')"
		/>
	</PongTooltip>
</template>
