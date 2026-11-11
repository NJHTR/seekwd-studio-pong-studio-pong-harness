<script lang="ts" setup>
import { Primitive } from 'reka-ui';
import { computed } from 'vue';

import type { IconSize } from '../../types';
import PongIcon from '../PongIcon';
import PongText from '../PongText';
import type { BadgeProps } from './Badge.type';

defineOptions({ name: 'PongBadge' });

const props = withDefaults(defineProps<BadgeProps>(), {
	variant: 'outline',
	size: 'xsmall',
	clickable: false,
});

const effectiveIconSize = computed(function getEffectiveIconSize(): IconSize {
	switch (props.size) {
		case 'large':
		case 'xlarge':
			return 'xlarge';
		default:
			return 'medium';
	}
});
const effectiveTextSize = computed(function getEffectiveTextSize() {
	switch (props.size) {
		case 'large':
		case 'xlarge':
			return 'sm';
		case 'xsmall':
		case 'xxsmall':
			return '2xs';
		default:
			return 'xs';
	}
});
</script>

<template>
	<Primitive
		:as="props.clickable ? 'button' : 'span'"
		:type="props.clickable ? 'button' : undefined"
		:disabled="props.clickable ? props.disabled : undefined"
		:class="[
			'pong-badge',
			$style.badge,
			$style[variant],
			$style[size],
			{ [$style.clickable]: props.clickable },
		]"
	>
		<PongIcon
			v-if="props.leadingIcon"
			:class="$style.leadingIcon"
			:icon="props.leadingIcon"
			:size="effectiveIconSize"
		/>
		<slot name="leading" />
		<PongText
			v-if="$slots.default"
			:class="[$style.label, { [$style.hasIcon]: props.leadingIcon || props.trailingIcon }]"
			:step="effectiveTextSize"
			bold
		>
			<slot></slot>
		</PongText>
		<slot name="trailing" />
		<PongIcon
			v-if="props.trailingIcon"
			:class="$style.trailingIcon"
			:icon="props.trailingIcon"
			:size="effectiveIconSize"
		/>
	</Primitive>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';
@use '../../css/mixins/utils';

.badge {
	display: inline-flex;
	align-items: center;
	white-space: nowrap;
	user-select: none;
	appearance: none;
	width: fit-content;

	--pong-badge--background: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	--pong-badge--border-color: var(--pong-badge--background);
	--pong-badge--text-color: var(--text-color--subtle);
	--pong-badge--height: var(--height--sm);
	--pong-badge--padding-inline-start: var(--spacing--2xs);
	--pong-badge--padding-inline-end: var(--spacing--2xs);
	--pong-badge--gap: var(--spacing--4xs);
	--pong-badge--radius: var(--radius--xs);

	border-radius: var(--pong-badge--radius);
	gap: var(--pong-badge--gap);
	background: var(--pong-badge--background);
	border: 1px solid var(--pong-badge--border-color);
	height: var(--pong-badge--height);
	padding-inline: var(--pong-badge--padding-inline-start) var(--pong-badge--padding-inline-end);
	color: var(--pong-badge--text-color);
}

.label {
	@include utils.utils-ellipsis;
}

.clickable {
	outline: none;
	cursor: pointer;

	&:not(:disabled):hover {
		background-color: color-mix(in srgb, var(--pong-badge--background), black 5%);
	}

	&:not(:disabled):active {
		background-color: color-mix(in srgb, var(--pong-badge--background), black 10%);
	}

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}

.xxsmall {
	--pong-badge--height: var(--height--2xs);
	--pong-badge--padding-inline-start: var(--spacing--2xs);
	--pong-badge--padding-inline-end: var(--spacing--2xs);
	--pong-badge--radius: var(--radius--2xs);
}

.xsmall {
	--pong-badge--height: var(--height--xs);
	--pong-badge--padding-inline-start: var(--spacing--2xs);
	--pong-badge--padding-inline-end: var(--spacing--2xs);
	--pong-badge--radius: var(--radius--2xs);
}

.small {
	--pong-badge--height: var(--height--sm);
	--pong-badge--padding-inline-start: var(--spacing--2xs);
	--pong-badge--padding-inline-end: var(--spacing--2xs);
}

.medium {
	--pong-badge--height: var(--height--md);
	--pong-badge--padding-inline-start: var(--spacing--xs);
	--pong-badge--padding-inline-end: var(--spacing--xs);
}

.large {
	--pong-badge--height: var(--height--lg);
	--pong-badge--padding-inline-start: var(--spacing--sm);
	--pong-badge--padding-inline-end: var(--spacing--sm);
}

.xlarge {
	--pong-badge--height: var(--height--xl);
	--pong-badge--padding-inline-start: var(--spacing--sm);
	--pong-badge--padding-inline-end: var(--spacing--sm);
	--pong-badge--radius: var(--radius--sm);
}

.filled {
	--pong-badge--background: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	--pong-badge--border-color: var(--pong-badge--background);
	--pong-badge--text-color: var(--text-color--subtle);
}

.primary {
	--pong-badge--background: var(--background--brand);
	--pong-badge--text-color: var(--color--neutral-black);
	box-shadow: var(--shadow--xs);
}

.secondary {
	--pong-badge--background: var(--color--purple-200);
	--pong-badge--text-color: var(--color--purple-900);
}

.subtle {
	--pong-badge--background: var(--background--surface);
	--pong-badge--border-color: var(--border-color);
	--pong-badge--text-color: var(--text-color--subtle);
	box-shadow: var(--shadow--xs);
}

.outline {
	--pong-badge--background: transparent;
	--pong-badge--border-color: var(--border-color);
	--pong-badge--text-color: var(--text-color);
}

.ghost {
	--pong-badge--background: transparent;
	--pong-badge--border-color: transparent;
	--pong-badge--text-color: var(--text-color);
}

.warning {
	--pong-badge--background: var(--color--yellow-200);
	--pong-badge--text-color: var(--color--yellow-900);
}

.danger {
	--pong-badge--background: var(--color--red-200);
	--pong-badge--text-color: var(--color--red-900);
}

.success {
	--pong-badge--background: var(--color--green-200);
	--pong-badge--text-color: var(--color--green-900);
}

.info {
	--pong-badge--background: var(--color--blue-200);
	--pong-badge--text-color: var(--color--blue-900);
}

.leadingIcon,
.trailingIcon {
	flex-shrink: 0;
	opacity: 0.9;
}

.leadingIcon + .label {
	margin-inline-end: calc(var(--pong-badge--padding-inline-end) * 0.2);
}

.label + .trailingIcon {
	margin-inline-start: calc(var(--pong-badge--padding-inline-start) * 0.2);
}

/* At small sizes the capitals sit above the middle of the icon. A label without an icon stays put. */
.xxsmall .hasIcon,
.xsmall .hasIcon {
	transform: translateY(1px);
}
</style>
