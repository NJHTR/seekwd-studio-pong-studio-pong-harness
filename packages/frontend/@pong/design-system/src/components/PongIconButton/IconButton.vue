<script lang="ts" setup>
import type { IconButtonProps } from '../../types/button';
import PongButton from '../PongButton';

defineOptions({ name: 'PongIconButton' });
const props = withDefaults(defineProps<IconButtonProps>(), {
	size: 'medium',
	loading: false,
	disabled: false,
	iconOnly: true,
});
</script>

<template>
	<PongButton v-bind="{ ...$attrs, ...props }" />
</template>
