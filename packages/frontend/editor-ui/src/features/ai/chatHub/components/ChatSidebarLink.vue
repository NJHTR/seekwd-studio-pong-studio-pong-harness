<script setup lang="ts" generic="T extends string">
import { PongActionDropdown, PongIcon, PongIconButton, PongText } from '@pong/design-system';
import type { ActionDropdownItem, IconName } from '@pong/design-system';
import { type RouteLocationRaw } from 'vue-router';

const {
	active = false,
	to,
	label,
	title,
	menuItems = [],
	icon,
	compact,
} = defineProps<{
	active?: boolean;
	to: RouteLocationRaw;
	label: string;
	title: string;
	menuItems?: Array<ActionDropdownItem<T>>;
	icon?: IconName;
	compact?: boolean;
}>();

const emit = defineEmits<{
	actionSelect: [action: T];
	click: [MouseEvent];
}>();

defineSlots<{
	default: unknown;
	icon: unknown;
}>();
</script>

<template>
	<div :class="[$style.menuItem, { [$style.active]: active }]">
		<slot v-if="$slots.default" />
		<template v-else>
			<RouterLink
				:to="to"
				:class="[$style.menuItemLink, { [$style.compact]: compact }]"
				:title="title"
				@click="emit('click', $event)"
			>
				<slot name="icon">
					<PongIcon v-if="icon" size="large" :icon="icon" />
				</slot>
				<div v-if="!compact" :class="$style.textContainer">
					<PongText :class="$style.label" size="small" color="text-light">{{ label }}</PongText>
					<PongText :class="$style.title" size="medium" color="text-dark">{{ title }}</PongText>
				</div>
			</RouterLink>
			<PongActionDropdown
				v-if="!compact && menuItems.length > 0"
				:items="menuItems"
				:class="$style.actionDropdown"
				placement="bottom-start"
				@select="emit('actionSelect', $event)"
				@click.stop
			>
				<template #activator>
					<PongIconButton variant="ghost" icon="ellipsis" :class="$style.actionDropdownTrigger" />
				</template>
			</PongActionDropdown>
		</template>
	</div>
</template>

<style lang="scss" module>
.menuItem {
	display: flex;
	align-items: center;
	border-radius: var(--spacing--4xs);
	padding-right: 0;

	&:focus-within,
	&:has([aria-expanded='true']),
	&.active,
	&:hover {
		background-color: var(--color--background--light-1);
	}
}

.menuItemLink {
	display: flex;
	align-items: center;
	padding: var(--spacing--4xs);
	gap: var(--spacing--4xs);
	cursor: pointer;
	color: var(--color--text);
	min-width: 0;
	flex: 1;
	text-decoration: none;
	outline: none;

	&.compact {
		margin-left: -1px;
	}

	&:active {
		color: var(--color--text--shade-1);
	}
}

.textContainer {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.label {
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	flex: 1;
	line-height: var(--line-height--xl);
	min-width: 0;
}

.title {
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	flex: 1;
	line-height: 20px;
	min-width: 0;
}

.actionDropdown {
	opacity: 0;
	flex-shrink: 0;
	width: 0;
	overflow: hidden;

	.menuItem:has([aria-expanded='true']) &,
	.menuItem:has(:focus) &,
	.menuItem:hover &,
	.active & {
		width: auto;
		opacity: 1;
	}
}

.actionDropdownTrigger {
	box-shadow: none !important;
	outline: none !important;
}
</style>
