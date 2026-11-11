<script lang="ts" setup>
import NodeIcon from '@/app/components/NodeIcon.vue';
import { VIEWS } from '@/app/constants/navigation';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { formatTimelineTime } from '../../utils/timeline-time';
import {
	PongAiActivityStepButton,
	PongAiActivityStepChevron,
	PongAiActivityStepResultSection,
	PongAnimatedCollapsibleContent,
	PongButton,
	PongCallout,
	PongCodeBlock,
	PongIcon,
	PongSpinner,
	PongText,
	PongTooltip,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { truncate } from '@pong/utils/string/truncate';
import { jsonParse } from 'pong-workflow';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTimelineItemExpansion } from '../../composables/useTimelineItemExpansion';
import type { TimelineItem } from '../../session-timeline.types';
import {
	isErroredToolCallTimelineItem,
	timelineItemErrorMessage,
} from '../../session-timeline.utils';
import { getToolOutputAttachments } from '../../utils/tool-output-files';
import { formatToolNameForDisplay, resolveToolNameForDisplay } from '../../utils/toolDisplayName';
import AgentChatMessageAttachments from '../AgentChatMessageAttachments.vue';
import SessionTimelinePill from '../SessionTimelinePill.vue';

const props = defineProps<{
	item: TimelineItem;
	selected: boolean;
	searchQuery?: string;
	/** Scope for the download URLs of output files. */
	projectId?: string;
	agentId?: string;
	threadId?: string;
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const router = useRouter();

const fullExecutionHref = computed(() => {
	const item = props.item;
	if (item.kind !== 'workflow' || !item.workflowId || !item.workflowExecutionId) return '';
	return router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: {
			workflowId: item.workflowId,
			executionId: item.workflowExecutionId,
		},
	}).href;
});

const nodeType = computed(() => {
	if (props.item.kind !== 'node' || !props.item.nodeType) return null;
	return nodeTypesStore.getNodeType(props.item.nodeType, props.item.nodeTypeVersion) ?? null;
});

const label = computed((): string => {
	if (props.item.kind === 'skill') {
		return (
			props.item.skillName ??
			resolveToolNameForDisplay(props.item.toolName, i18n, props.item.toolOutput)
		);
	}
	if (props.item.kind === 'workflow') {
		return props.item.workflowName ?? formatToolNameForDisplay(props.item.toolName);
	}
	if (props.item.kind === 'node') {
		return props.item.nodeDisplayName ?? formatToolNameForDisplay(props.item.toolName);
	}
	return resolveToolNameForDisplay(props.item.toolName, i18n, props.item.toolOutput);
});

const isRunning = computed(() => props.item.activityStatus === 'running');

const isInterrupted = computed(() => props.item.activityStatus === 'interrupted');

const canExpand = computed(() => !isRunning.value && !isInterrupted.value);

const error = computed((): string | undefined => {
	if (props.item.activityStatus === 'waiting' || isRunning.value || isInterrupted.value) {
		return undefined;
	}
	if (props.item.activityStatus !== 'failed' && !isErroredToolCallTimelineItem(props.item)) {
		return undefined;
	}
	return timelineItemErrorMessage(props.item) || i18n.baseText('agentSessions.timeline.toolError');
});

const errorTooltip = computed(() => (error.value ? truncate(error.value, 160) : ''));

const time = computed(() => formatTimelineTime(props.item.timestamp));

function stringifyJson(value: unknown): string {
	if (typeof value === 'string') {
		try {
			return JSON.stringify(JSON.parse(value), null, 2);
		} catch {
			return value;
		}
	}
	return JSON.stringify(value, null, 2) ?? String(value);
}

const outputFiles = computed(() => {
	const output = props.item.toolOutput;
	return getToolOutputAttachments(
		typeof output === 'string' ? jsonParse(output, { fallbackValue: output }) : output,
	);
});

const searchableText = computed((): string => {
	return [
		label.value,
		props.item.toolInput !== undefined ? stringifyJson(props.item.toolInput) : '',
		props.item.toolOutput !== undefined ? stringifyJson(props.item.toolOutput) : '',
	].join('\n');
});

const { isOpen } = useTimelineItemExpansion({
	searchQuery: () => props.searchQuery,
	canExpand,
	searchableText,
});
</script>

<template>
	<div
		data-test-id="session-capability-item"
		:data-status="item.activityStatus"
		:class="[$style.step, { [$style.failed]: error, [$style.interrupted]: isInterrupted }]"
	>
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
						:loading="isRunning"
						:interactive="canExpand"
						:tabindex="canExpand ? undefined : -1"
						:aria-disabled="!canExpand || undefined"
					>
						<template #prefix>
							<span :class="$style.iconContainer">
								<span role="status"></span>
								<PongSpinner v-if="isRunning" type="grid" size="medium" />
								<PongIcon
									v-else-if="isInterrupted"
									icon="circle-x"
									size="medium"
									:class="$style.interruptedIcon"
								/>
								<PongTooltip v-else-if="error" placement="top">
									<template #content>{{ errorTooltip }}</template>
									<PongIcon icon="circle-alert" color="danger" size="medium" />
								</PongTooltip>
								<NodeIcon v-else-if="nodeType" :node-type="nodeType" :size="20" />
								<SessionTimelinePill v-else :kind="item.kind" :label="label" />
							</span>
						</template>
						{{ label }}
						<template v-if="canExpand" #suffix>
							<PongAiActivityStepChevron :open="isOpen" />
						</template>
					</PongAiActivityStepButton>
				</CollapsibleTrigger>
				<PongText step="xs" color="text-light" bold>{{ time }}</PongText>
			</div>
			<PongAnimatedCollapsibleContent v-if="canExpand">
				<div :class="$style.content">
					<PongAiActivityStepResultSection
						v-if="item.toolInput !== undefined"
						:class="$style.toolSection"
					>
						<PongText step="xs" color="text-light" bold :class="$style.toolTitle">
							{{ i18n.baseText('agentSessions.timeline.input') }}
						</PongText>
						<PongCodeBlock
							data-test-id="timeline-tool-input"
							:code="stringifyJson(item.toolInput)"
							language="json"
							:class="$style.toolCode"
						/>
					</PongAiActivityStepResultSection>
					<PongAiActivityStepResultSection v-if="error" :class="$style.toolSection">
						<PongCallout theme="danger" :class="$style.errorCallout">
							{{ error }}
						</PongCallout>
					</PongAiActivityStepResultSection>
					<PongAiActivityStepResultSection
						v-if="item.toolOutput !== undefined && !error"
						:class="$style.toolSection"
					>
						<PongText step="xs" color="text-light" bold :class="$style.toolTitle">
							{{ i18n.baseText('agentSessions.timeline.output') }}
						</PongText>
						<PongCodeBlock
							data-test-id="timeline-tool-output"
							:code="stringifyJson(item.toolOutput)"
							language="json"
							:class="$style.toolCode"
						/>
					</PongAiActivityStepResultSection>
					<PongAiActivityStepResultSection v-if="fullExecutionHref" :class="$style.toolSection">
						<div :class="$style.executionButton">
							<PongButton
								variant="outline"
								size="small"
								:label="i18n.baseText('agentSessions.workflowLog.openFull')"
								:href="fullExecutionHref"
								target="_blank"
								rel="noopener noreferrer"
								data-test-id="open-full-execution"
							/>
						</div>
					</PongAiActivityStepResultSection>
				</div>
			</PongAnimatedCollapsibleContent>
		</CollapsibleRoot>
		<AgentChatMessageAttachments
			v-if="outputFiles.length > 0 && projectId && agentId"
			:class="$style.outputFiles"
			:attachments="outputFiles"
			:project-id="projectId"
			:agent-id="agentId"
			:thread-id="threadId"
			data-test-id="timeline-tool-output-files"
		/>
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

.failed {
	--ai-activity-step--color: var(--color--text--danger);
}

.interrupted {
	--ai-activity-step--color: var(--text-color--disabled);

	button:hover {
		color: var(--text-color--disabled);
	}
}

.interruptedIcon {
	color: var(--icon-color--subtle);
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

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-inline-end: var(--spacing--2xs);
	text-align: right;
	font-variant-numeric: tabular-nums;

	> button:disabled {
		pointer-events: none;
	}
}

.outputFiles {
	margin: var(--spacing--4xs) 0 var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
}

.toolTitle {
	margin-top: var(--spacing--xs);
}

.toolSection {
	background-color: transparent;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	border: 0;
	padding-inline: var(--spacing--md);
	margin-block: 0;
	border-left: var(--border);
	border-radius: 0;

	/** Vertically aligns the rail with center of icon **/
	transform: translateX(calc(var(--spacing--sm) + 2px));
}

.executionButton {
	padding-top: var(--spacing--xs);
}

.toolCode {
	background-color: var(--background--surface);
}

.errorCallout {
	margin-top: var(--spacing--xs);
	overflow-wrap: anywhere;
	word-break: break-word;
}
</style>
