<script setup lang="ts">
import PongIcon from '../PongIcon';

withDefaults(defineProps<{ size?: 'small' | 'mini' }>(), {
	size: 'small',
});
</script>

<template>
	<div :class="[$style.container, $style[size]]">
		<PongIcon icon="pong-assistant" :size="size === 'mini' ? 8 : 10" color="--color--neutral-white" />
	</div>
</template>

<style lang="scss" module>
.container {
	background: var(--assistant--color--highlight-gradient);
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.small {
	height: var(--spacing--md);
	width: var(--spacing--md);
}

.mini {
	height: var(--spacing--sm);
	width: var(--spacing--sm);
}
</style>
