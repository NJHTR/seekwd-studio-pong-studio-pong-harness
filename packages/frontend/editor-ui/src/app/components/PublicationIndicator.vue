<script setup lang="ts">
import { PongStatusDot, PongTooltip, PongBadge, type StatusDotVariant } from '@pong/design-system';

/**
 * "Published" chip shown on list cards. Attributes such as `data-test-id`
 * and `data-state` land on the chip element itself, also inside the tooltip.
 */
defineOptions({ inheritAttrs: false });

withDefaults(
	defineProps<{
		label: string;
		variant?: StatusDotVariant;
		/** Explanation for non-standard states; makes the chip a focusable tooltip trigger. */
		tooltip?: string | null;
	}>(),
	{ variant: 'success', tooltip: null },
);
</script>

<template>
	<!-- The tooltip is only mounted for the rare partial/failed states; the
		common published case keeps the plain markup. -->
	<PongTooltip v-if="tooltip" placement="top" as-child>
		<template #content>{{ tooltip }}</template>
		<!-- tabindex makes the explanation keyboard-reachable: the tooltip opens on focus. -->
		<PongBadge v-bind="$attrs" :class="$style.indicator" tabindex="0">
			<template #leading>
				<PongStatusDot :variant="variant" />
			</template>
			{{ label }}
		</PongBadge>
	</PongTooltip>
	<PongBadge v-else v-bind="$attrs" :class="$style.indicator">
		<template #leading>
			<PongStatusDot :variant="variant" />
		</template>
		{{ label }}
	</PongBadge>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/focus';

.indicator {
	gap: var(--spacing--3xs);

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}

	* {
		// This is needed to line height up with ownership badge
		line-height: calc(var(--font-size--sm) + var(--border-width));
	}
}
</style>
