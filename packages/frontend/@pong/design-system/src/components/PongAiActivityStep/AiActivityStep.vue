<script lang="ts" setup>
import { truncate } from '@pong/utils/string/truncate';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, inject } from 'vue';

import { aiActivityStepGroupContext } from './context';
import PongAiActivityStepButton from '../PongAiActivityStepButton';
import PongAiActivityStepChevron from '../PongAiActivityStepChevron';
import PongAiActivityStepResultSection from '../PongAiActivityStepResultSection';
import PongAnimatedCollapsibleContent from '../PongAnimatedCollapsibleContent';
import PongCallout from '../PongCallout';
import PongIcon from '../PongIcon';
import type { IconName } from '../PongIcon/icons';
import PongTooltip from '../PongTooltip';

const props = withDefaults(
	defineProps<{
		label: string;
		loading?: boolean;
		error?: string;
		/** Whether the step has collapsible content. */
		hasContent?: boolean;
		/** Wraps slot content in the standard activity data panel. */
		wrapContent?: boolean;
		/** Keep error icon/tooltip but skip the inner danger callout. */
		hideErrorCallout?: boolean;
		errorIcon?: IconName;
	}>(),
	{
		loading: false,
		error: undefined,
		hasContent: true,
		wrapContent: false,
		hideErrorCallout: false,
		errorIcon: 'triangle-alert',
	},
);

defineSlots<{
	prefix?: () => unknown;
	default?: () => unknown;
	/** Replaces the callout text; the tooltip keeps showing `error`. */
	errorCallout?: () => unknown;
}>();

const MAX_ERROR_TOOLTIP_LENGTH = 160;

const isNested = inject(aiActivityStepGroupContext, false);

const errorTooltip = computed(() =>
	props.error ? truncate(props.error, MAX_ERROR_TOOLTIP_LENGTH) : '',
);
</script>

<template>
	<div :class="{ [$style.nestedRow]: isNested, [$style.row]: !isNested }">
		<span v-if="isNested" :class="$style.rail">
			<span :class="$style.railDot" />
		</span>
		<CollapsibleRoot v-if="props.hasContent" v-slot="{ open: isOpen }">
			<CollapsibleTrigger as-child>
				<PongAiActivityStepButton size="small" :loading="props.loading">
					<template #prefix><slot name="prefix" /></template>
					{{ props.label }}
					<template #icon>
						<PongTooltip v-if="props.error" placement="top">
							<template #content>
								<span :class="$style.errorTooltip">{{ errorTooltip }}</span>
							</template>
							<PongIcon
								:icon="props.errorIcon"
								color="danger"
								size="small"
								:class="$style.activityErrorIcon"
							/>
						</PongTooltip>
					</template>
					<template #suffix>
						<PongAiActivityStepChevron :open="isOpen" />
					</template>
				</PongAiActivityStepButton>
			</CollapsibleTrigger>
			<PongAnimatedCollapsibleContent>
				<PongAiActivityStepResultSection v-if="props.wrapContent">
					<slot />
				</PongAiActivityStepResultSection>
				<slot v-else />
				<PongCallout
					v-if="props.error !== undefined && !props.hideErrorCallout"
					theme="danger"
					:class="$style.errorCallout"
				>
					<slot name="errorCallout">{{ props.error }}</slot>
				</PongCallout>
			</PongAnimatedCollapsibleContent>
		</CollapsibleRoot>
		<PongAiActivityStepButton v-else size="small" :loading="props.loading" :interactive="false">
			<template #prefix><slot name="prefix" /></template>
			{{ props.label }}
			<template #icon>
				<PongTooltip v-if="props.error" placement="top">
					<template #content>
						<span :class="$style.errorTooltip">{{ errorTooltip }}</span>
					</template>
					<PongIcon
						:icon="props.errorIcon"
						color="danger"
						size="small"
						:class="$style.activityErrorIcon"
					/>
				</PongTooltip>
			</template>
		</PongAiActivityStepButton>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	flex-direction: column;
}
.nestedRow {
	display: grid;
	grid-template-columns: var(--spacing--md) minmax(0, 1fr);
	column-gap: var(--spacing--3xs);
	margin-left: calc(var(--spacing--4xs) * -1);
}

.rail {
	position: relative;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	align-self: self-start;
	width: var(--spacing--md);
	min-height: var(--spacing--lg);
	height: 100%;

	&::before,
	&::after {
		content: '';
		position: absolute;
		left: 50%;
		width: 1px;
		background-color: var(--border-color);
		transform: translateX(-50%);
	}

	&::before {
		top: 0;
		height: calc(var(--spacing--xs) - var(--spacing--4xs));
	}

	&::after {
		top: calc(var(--spacing--xs) + calc(var(--spacing--3xs) + var(--spacing--4xs)));
		/** Extends the rail through the parent timeline gap when that shared value is set. */
		bottom: calc(var(--pong--ai-activity-step-gap, 0px) * -1);
	}
}

.nestedRow:first-child .rail::before,
.nestedRow:last-child .rail::after {
	display: none;
}

.railDot {
	position: relative;
	z-index: 1;
	top: var(--spacing--xs);
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: 50%;
	background-color: var(--text-color--subtler);
}

.errorTooltip {
	white-space: pre-wrap;
}

.errorCallout {
	margin-top: var(--spacing--xs);
	max-width: 90%;
	overflow-wrap: anywhere;
	word-break: break-word;
}
.activityErrorIcon {
	transform: translateY(1px);
}
</style>
