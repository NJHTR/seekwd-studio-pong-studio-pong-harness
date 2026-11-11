<script setup lang="ts">
import type { ListboxItemEmits, ListboxItemProps, ListboxItemSlots } from './ListboxItem.types';
import { ListboxItem } from './reka-ui';

defineOptions({ name: 'PongListboxItem' });

defineProps<ListboxItemProps>();
defineSlots<ListboxItemSlots>();

const emit = defineEmits<ListboxItemEmits>();

function onSelect(event: Event) {
	emit('select', event);
}
</script>

<template>
	<ListboxItem
		:value="value"
		:disabled="disabled"
		:aria-disabled="disabled ? 'true' : undefined"
		:data-value="value"
		:class="$style.item"
		@select="onSelect"
	>
		<span v-if="$slots.leading" :class="$style.leading">
			<slot name="leading" />
		</span>
		<span :class="$style.content">
			<slot />
		</span>
		<span v-if="$slots.trailing" :class="$style.trailing">
			<slot name="trailing" />
		</span>
	</ListboxItem>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/floating-item' as floating-item;

.item {
	@include floating-item.floating-item;

	gap: var(--pong-listbox-item--gap, var(--spacing--2xs));
	min-height: var(--pong-listbox-item--min-height, var(--spacing--xl));
	padding: var(--pong-listbox-item--padding, var(--spacing--2xs) var(--spacing--xs));
	border-radius: var(--pong-listbox-item--radius, var(--radius));

	&:not([data-disabled]) {
		cursor: pointer;

		&:not([data-state='checked'])[data-highlighted] {
			background-color: var(
				--pong-listbox-item--color--background--highlight,
				var(--background--hover)
			);
		}
	}

	&[data-state='checked'] {
		background-color: var(
			--pong-listbox-item--color--background--selected,
			var(--background--active)
		);
	}

	&[data-disabled] {
		color: var(--pong-listbox-item--color--text--disabled, var(--text-color--disabled));
		cursor: not-allowed;
	}
}

.leading,
.trailing {
	display: inline-flex;
	flex: none;
	align-items: center;
}

.content {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	gap: var(--pong-listbox-item--content-gap, var(--spacing--5xs));
}
</style>
