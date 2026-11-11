<script lang="ts" setup>
import { createEventBus, type EventBus } from '@pong/utils/event-bus';
import { onMounted, ref } from 'vue';

import type { IconColor } from '../../types/icon';
import PongIcon from '../PongIcon';
import { type IconName } from '../PongIcon/icons';
import PongText from '../PongText';
import PongTooltip from '../PongTooltip';

export interface IAccordionItem {
	id: string;
	label: string;
	icon: IconName;
	iconColor?: IconColor;
	tooltip?: string | null;
}

interface InfoAccordionProps {
	title?: string;
	description?: string;
	items?: IAccordionItem[];
	initiallyExpanded?: boolean;
	headerIcon?: { icon: IconName; color: IconColor };
	eventBus?: EventBus;
}

defineOptions({ name: 'PongInfoAccordion' });
const props = withDefaults(defineProps<InfoAccordionProps>(), {
	items: () => [],
	initiallyExpanded: false,
	eventBus: () => createEventBus(),
});
const emit = defineEmits<{
	'click:body': [e: MouseEvent];
	tooltipClick: [item: string, e: MouseEvent];
}>();

const expanded = ref(false);
onMounted(() => {
	props.eventBus.on('expand', () => {
		expanded.value = true;
	});
	expanded.value = props.initiallyExpanded;
});

const toggle = () => {
	expanded.value = !expanded.value;
};

const onClick = (e: MouseEvent) => emit('click:body', e);

const onTooltipClick = (item: string, event: MouseEvent) => emit('tooltipClick', item, event);
</script>

<template>
	<div :class="['accordion', $style.container]">
		<div :class="{ [$style.header]: true, [$style.expanded]: expanded }" @click="toggle">
			<PongIcon v-if="headerIcon" :icon="headerIcon.icon" :color="headerIcon.color" size="small" />
			<PongText :class="$style.headerText" color="text-base" size="small" align="left" bold>{{
				title
			}}</PongText>
			<PongIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" bold />
		</div>
		<div
			v-if="expanded"
			:class="{ [$style.description]: true, [$style.collapsed]: !expanded }"
			@click="onClick"
		>
			<!-- Info accordion can display list of items with icons or just a HTML description -->
			<div v-if="items.length > 0" :class="$style.accordionItems">
				<div v-for="item in items" :key="item.id" :class="$style.accordionItem">
					<PongTooltip :disabled="!item.tooltip">
						<template #content>
							<div v-pong-html="item.tooltip" @click="onTooltipClick(item.id, $event)"></div>
						</template>
						<PongIcon :icon="item.icon" :color="item.iconColor" size="small" class="mr-2xs" />
					</PongTooltip>
					<PongText size="small" color="text-base">{{ item.label }}</PongText>
				</div>
			</div>
			<PongText color="text-base" size="small" align="left">
				<span v-pong-html="description"></span>
			</PongText>
			<slot name="customContent"></slot>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: var(--color--background);
}

.header {
	cursor: pointer;
	display: flex;
	padding: var(--spacing--sm);
	align-items: center;
	justify-content: flex-start;
	gap: var(--spacing--3xs);
}

.expanded {
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--2xs) var(--spacing--sm);
}

.accordionItems {
	display: flex;
	flex-direction: column !important;
	align-items: flex-start !important;
	width: 100%;
}

.accordionItem {
	display: block !important;
	text-align: left;
}

.description {
	display: flex;
	padding: 0 var(--spacing--sm) var(--spacing--sm) var(--spacing--sm);

	b {
		font-weight: var(--font-weight--medium);
	}
}
</style>
