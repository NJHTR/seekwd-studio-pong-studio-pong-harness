<script setup lang="ts">
import { computed } from 'vue';
import type { AgentBackgroundJobSignal } from '@pong/api-types';
import { PongAiActivityStep, PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { BACKGROUND_JOB_STATUS_LABEL_KEYS } from '../utils/background-job-labels';
import AgentChatMessageAttachments from './AgentChatMessageAttachments.vue';

const props = defineProps<{
	signal: AgentBackgroundJobSignal;
	projectId?: string;
	agentId?: string;
}>();
const i18n = useI18n();

const files = computed(() => props.signal.tasks.flatMap((job) => job.files ?? []));
</script>

<template>
	<div>
		<PongAiActivityStep
			:label="i18n.baseText('agents.chat.backgroundTasks.resultsReceived')"
			wrap-content
			data-testid="agent-chat-background-job-signal"
		>
			<ul :class="$style.jobs">
				<li v-for="job in props.signal.tasks" :key="job.id" :class="$style.job">
					<PongText size="small" color="text-dark" :class="$style.title">{{ job.title }}</PongText>
					<span :class="$style.outcome">
						<PongIcon
							:icon="job.status === 'completed' ? 'circle-check' : 'circle-x'"
							:class="$style.statusIcon"
							:data-status="job.status"
							size="small"
						/>
						<PongText size="small" color="text-base">{{
							i18n.baseText(BACKGROUND_JOB_STATUS_LABEL_KEYS[job.status])
						}}</PongText>
					</span>
				</li>
			</ul>
		</PongAiActivityStep>
		<AgentChatMessageAttachments
			v-if="files.length && projectId && agentId"
			:class="$style.files"
			:attachments="files"
			:project-id="projectId"
			:agent-id="agentId"
		/>
	</div>
</template>

<style module lang="scss">
@use '@pong/design-system/css/mixins/motion';

.jobs {
	list-style: none;
	margin: 0;
	padding: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.job {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: var(--spacing--sm);
}

.files {
	margin-top: var(--spacing--4xs);
}

.title {
	overflow-wrap: anywhere;
}

.outcome {
	display: inline-flex;
	align-items: center;
	align-self: start;
	gap: var(--spacing--3xs);
}

.statusIcon {
	flex-shrink: 0;
	color: var(--color--foreground--shade-2);

	&[data-status='completed'] {
		color: var(--color--success);
		@include motion.fade-in;
	}

	&[data-status='failed'] {
		color: var(--color--danger);
	}
}
</style>
