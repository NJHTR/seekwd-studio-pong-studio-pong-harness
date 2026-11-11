<script lang="ts" setup>
import PongIcon from '../PongIcon';

withDefaults(
	defineProps<{
		/** Whether the disclosure content is visible. */
		open: boolean;
		/** Direction of the chevron when the disclosure is closed. */
		direction?: 'right' | 'down';
	}>(),
	{ direction: 'right' },
);
</script>

<template>
	<PongIcon
		icon="chevron-right"
		:size="10"
		color="text-light"
		:class="[$style.chevron, direction === 'down' && $style.down, open && $style.open]"
		aria-hidden="true"
	/>
</template>

<style lang="scss" module>
.chevron {
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	transform-origin: center;
	/** Keep the optical offset when the transform rotates the icon. */
	translate: 0 1px;
}

.open {
	transform: rotate(90deg);
}

.down {
	transform: rotate(90deg);

	&.open {
		transform: rotate(270deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.chevron {
		transition: none;
	}
}
</style>
