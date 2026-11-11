<script setup lang="ts">
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import type { AgentJsonConfig } from '@pong/api-types';
import { nodeNameToToolName } from 'pong-workflow';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { PongApprovalCard, PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useApprovalCardLabels } from '@/app/composables/useApprovalCardLabels';
import type { ApprovalInput, ApprovalResume } from '@/features/ai/shared/agentsChat/types';

const props = withDefaults(
	defineProps<{
		input: ApprovalInput;
		taskTitle?: string;
		agentName?: string;
		tools?: AgentJsonConfig['tools'];
		disabled?: boolean;
		autoFocus?: boolean;
		/** Show number shortcuts and enable their key events. */
		useKeyShortcuts?: boolean;
	}>(),
	{ autoFocus: true, useKeyShortcuts: true },
);

const emit = defineEmits<{
	submit: [resumeData: ApprovalResume];
}>();

const i18n = useI18n();
const approvalLabels = useApprovalCardLabels();

const toolLabel = computed(() => props.input.displayName ?? props.input.toolName);
const nodeType = computed(() => {
	const tool = props.tools?.find(
		(tool) => tool.type === 'node' && nodeNameToToolName(tool.name) === props.input.toolName,
	);
	if (tool?.type !== 'node') return null;
	const nodeTypesStore = useNodeTypesStore();
	return (
		nodeTypesStore.getNodeType(tool.node.nodeType, tool.node.nodeTypeVersion) ??
		nodeTypesStore.communityNodeType(tool.node.nodeType)?.nodeDescription ??
		null
	);
});

function submit(key: string) {
	if (props.disabled) return;
	if (key === 'always-allow') {
		emit('submit', { approved: true, scope: 'session' });
		return;
	}
	if (key === 'allow-once' || key === 'deny') {
		emit('submit', { approved: key === 'allow-once' });
	}
}
</script>

<template>
	<PongApprovalCard
		:title="
			i18n.baseText('agents.chat.approval.description', { interpolate: { toolName: toolLabel } })
		"
		:labels="approvalLabels"
		:args="input.args"
		:supports-session-approval="input.supportsSessionApproval"
		:disabled="disabled"
		:auto-focus="autoFocus"
		:use-key-shortcuts="useKeyShortcuts"
		data-testid="agent-approval-card"
		@select="submit"
	>
		<template #title>
			<PongText
				v-if="taskTitle"
				bold
				step="sm"
				:class="$style.taskTitle"
				data-testid="agent-approval-task-title"
			>
				{{
					i18n.baseText('agents.chat.backgroundTasks.approvalFor', {
						interpolate: { title: taskTitle },
					})
				}}
			</PongText>
			<PongText step="sm">
				<I18nT keypath="agents.chat.approval.agentDescription" scope="global">
					<template #agentName>
						{{ agentName?.trim() || i18n.baseText('agentSessions.timeline.agent') }}
					</template>
					<template #toolName>
						<span :class="$style.nameBadge">
							<NodeIcon v-if="nodeType" :node-type="nodeType" aria-hidden="true" />
							<PongIcon v-else icon="wrench" aria-hidden="true" />
							{{ toolLabel }}
						</span>
					</template>
				</I18nT>
			</PongText>
		</template>
	</PongApprovalCard>
</template>

<style module lang="scss">
.taskTitle {
	display: block;
	margin-block-end: var(--spacing--3xs);
	overflow-wrap: anywhere;
}

.nameBadge {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	color: var(--text-color);
	gap: var(--spacing--3xs);
	height: 1lh;
	transform: translateY(2px);
	padding: var(--spacing--4xs);
	font-weight: var(--font-weight--medium);
}
</style>
