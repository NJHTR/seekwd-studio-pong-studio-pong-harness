<script setup lang="ts">
import { ref } from 'vue';
import type { IconColor } from '@pong/design-system';
import { type IconName } from '@pong/design-system';

import { PongIcon, PongText } from '@pong/design-system';
const props = withDefaults(
	defineProps<{
		icon?: IconName;
		iconColor?: IconColor;
		initialExpanded?: boolean;
	}>(),
	{
		icon: 'list-checks',
		iconColor: 'text-dark',
		initialExpanded: true,
	},
);

const expanded = ref<boolean>(props.initialExpanded);

function toggle() {
	expanded.value = !expanded.value;
}
</script>

<template>
	<div :class="['accordion', $style.container]">
		<div :class="{ [$style.header]: true, [$style.expanded]: expanded }" @click="toggle">
			<PongIcon :icon="icon" :color="iconColor" size="small" class="mr-2xs" />
			<PongText :class="$style.headerText" color="text-base" size="small" align="left" bold>
				<slot name="title"></slot>
			</PongText>
			<PongIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" bold />
		</div>
		<div v-if="expanded" :class="{ [$style.description]: true, [$style.collapsed]: !expanded }">
			<slot name="content"></slot>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
}

.header {
	cursor: pointer;
	display: flex;
	padding-top: var(--spacing--sm);
	align-items: center;

	.headerText {
		flex-grow: 1;
	}
}

.expanded {
	padding: var(--spacing--sm) 0 0 0;
}

.description {
	display: flex;
	padding: 0 var(--spacing--sm) var(--spacing--sm) var(--spacing--sm);

	b {
		font-weight: var(--font-weight--medium);
	}
}
</style>
