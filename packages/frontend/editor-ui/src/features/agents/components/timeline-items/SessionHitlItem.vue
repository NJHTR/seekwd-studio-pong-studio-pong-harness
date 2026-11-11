<script lang="ts" setup>
import { formatTimelineTime } from '../../utils/timeline-time';
import {
	PongAiActivityStepButton,
	PongAiActivityStepChevron,
	PongAiActivityStepResultSection,
	PongAnimatedCollapsibleContent,
	PongBadge,
	PongCodeBlock,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed } from 'vue';
import { useTimelineItemExpansion } from '../../composables/useTimelineItemExpansion';
import type { TimelineItem } from '../../session-timeline.types';
import {
	hitlRequestLabelKey,
	hitlTimelineName,
	timelineItemStatus,
} from '../../session-timeline.utils';
import SessionTimelinePill from '../SessionTimelinePill.vue';

const props = defineProps<{
	item: TimelineItem;
	selected: boolean;
	searchQuery?: string;
}>();

const i18n = useI18n();

const label = computed(function getLabel() {
	return hitlTimelineName(props.item, i18n);
});

const status = computed(function getStatus() {
	return (
		timelineItemStatus(props.item) ?? {
			labelKey: hitlRequestLabelKey(props.item.hitlRequestType),
			theme: 'outline' as const,
		}
	);
});

const time = computed(() => formatTimelineTime(props.item.timestamp));

function parseContent(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed;
	} catch {
		return value;
	}
}

const content = computed(function getContent() {
	if (props.item.kind === 'hitl-response') return parseContent(props.item.hitlResponse);
	const request = parseContent(props.item.hitlRequest);
	if (
		props.item.hitlRequestType === 'approval' &&
		request !== null &&
		typeof request === 'object' &&
		'args' in request
	) {
		return request.args;
	}
	return request;
});

const contentCode = computed(function getContentCode() {
	return typeof content.value === 'string'
		? content.value
		: (JSON.stringify(content.value, null, 2) ?? String(content.value));
});

const canExpand = computed(function getCanExpand() {
	return content.value !== undefined;
});

const { isOpen } = useTimelineItemExpansion({
	searchQuery: () => props.searchQuery,
	canExpand,
	searchableText: () => `${label.value}\n${contentCode.value}`,
});
</script>

<template>
	<div data-test-id="session-hitl-item" :class="$style.step">
		<CollapsibleRoot
			:open="canExpand && isOpen"
			:disabled="!canExpand"
			@update:open="isOpen = canExpand && $event"
		>
			<div :class="$style.header">
				<CollapsibleTrigger as-child>
					<PongAiActivityStepButton
						:class="$style.activityButton"
						size="small"
						:interactive="canExpand"
						:tabindex="canExpand ? undefined : -1"
						:aria-disabled="!canExpand || undefined"
					>
						<template #prefix>
							<span :class="$style.iconContainer">
								<SessionTimelinePill :kind="item.kind" :label="label" />
							</span>
						</template>
						{{ label }}
						<template v-if="canExpand" #suffix>
							<PongAiActivityStepChevron :open="isOpen" />
						</template>
					</PongAiActivityStepButton>
				</CollapsibleTrigger>
				<div :class="$style.meta">
					<PongBadge
						:variant="status.theme"
						size="xxsmall"
						:data-test-id="
							item.kind === 'hitl-response'
								? 'timeline-hitl-response-badge'
								: 'timeline-hitl-request-badge'
						"
					>
						{{ i18n.baseText(status.labelKey) }}
					</PongBadge>
					<PongText step="xs" color="text-light" bold>{{ time }}</PongText>
				</div>
			</div>
			<PongAnimatedCollapsibleContent v-if="canExpand">
				<PongAiActivityStepResultSection :class="$style.section">
					<PongText step="xs" color="text-light" bold :class="$style.title">
						{{
							i18n.baseText(
								item.kind === 'hitl-response'
									? 'agentSessions.timeline.response'
									: 'agentSessions.timeline.requestDetails',
							)
						}}
					</PongText>
					<PongCodeBlock :code="contentCode" language="json" :class="$style.code" />
				</PongAiActivityStepResultSection>
			</PongAnimatedCollapsibleContent>
		</CollapsibleRoot>
	</div>
</template>

<style module lang="scss">
.step .activityButton {
	--ai-activity-step--padding: var(--spacing--2xs);
	--button--color--background-hover: var(--background--hover);
	--button--color--background-active: var(--background--active);
}

.step {
	margin-inline: var(--spacing--2xs);
	--ai-activity-step--color: var(--text-color--subtle);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
	padding-inline-end: var(--spacing--2xs);
	text-align: right;
	font-variant-numeric: tabular-nums;

	> button {
		min-width: 0;
	}

	> button:disabled {
		pointer-events: none;
	}
}

.iconContainer {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	flex-shrink: 0;
	border-radius: var(--radius);
}

.meta {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--sm);
	margin-inline-start: auto;
	flex-shrink: 0;
	white-space: nowrap;
}

.section {
	background-color: transparent;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	border: 0;
	padding-inline: var(--spacing--md);
	margin-block: 0;
	border-left: var(--border);
	border-radius: 0;

	/** Align the rail with the icon center. */
	transform: translateX(calc(var(--spacing--sm) + var(--spacing--5xs)));
	background-color: transparent;
}

.title {
	margin-top: var(--spacing--xs);
}

.code {
	background-color: var(--background--surface);
}
</style>
