<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { AgentChatListItem } from '@pong/api-types';
import { PongButton, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_PONG_CHAT_VIEW } from '../../constants';
import { useAgentTelemetry, type PongChatAgentSource } from '../../composables/useAgentTelemetry';
import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';
import { usePongAssistantIdentity } from '../composables/usePongAssistantIdentity';

const props = defineProps<{
	/** `null` renders the pong Assistant, which links back to the Assistant page. */
	agent: AgentChatListItem | null;
	/** Where the card was shown, for the selection telemetry event. */
	source: PongChatAgentSource;
}>();

const emit = defineEmits<{
	'make-available': [agent: AgentChatListItem];
}>();

const i18n = useI18n();
const assistant = usePongAssistantIdentity();
const agentTelemetry = useAgentTelemetry();

const to = computed(() =>
	props.agent
		? { name: AGENT_PONG_CHAT_VIEW, params: { agentId: props.agent.id } }
		: { name: INSTANCE_AI_VIEW },
);
// An agent the user owns that is not in pong Chat yet: no link, only the "Make available" action.
const isUnavailable = computed(() => props.agent !== null && !props.agent.availableInChat);
const name = computed(() => props.agent?.name ?? assistant.name.value);
const description = computed(() =>
	props.agent ? props.agent.description : assistant.description.value,
);

function onClick(): void {
	if (!props.agent || isUnavailable.value) return;
	agentTelemetry.trackSelectedPongChatAgent({ agentId: props.agent.id, source: props.source });
}
</script>

<template>
	<component
		:is="isUnavailable ? 'div' : RouterLink"
		:to="isUnavailable ? undefined : to"
		:class="[$style.card, { [$style.unavailable]: isUnavailable }]"
		data-test-id="pong-chat-agent-card"
		@click="onClick"
	>
		<div :class="$style.main">
			<AgentPersonalisationIcon
				:personalisation="agent ? agent.personalisation : assistant.personalisation"
				:size="40"
				:class="$style.muted"
			/>
			<div :class="[$style.content, $style.muted]">
				<PongText bold :class="$style.title" data-test-id="pong-chat-agent-card-name">
					{{ name }}
				</PongText>
				<PongText
					v-if="description"
					size="small"
					color="text-light"
					:class="$style.description"
					data-test-id="pong-chat-agent-card-description"
				>
					{{ description }}
				</PongText>
			</div>
		</div>
		<PongButton
			v-if="isUnavailable && agent"
			variant="ghost"
			size="small"
			:class="$style.makeAvailable"
			data-test-id="pong-chat-agent-card-make-available"
			@click="emit('make-available', agent)"
		>
			{{ i18n.baseText('agents.pongChatPage.makeAvailable.action') }}
		</PongButton>
	</component>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/focus';

.card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	text-decoration: none;
	color: inherit;
	transition: box-shadow 0.3s ease;

	&:hover {
		box-shadow: var(--shadow--card-hover);
	}

	@include focus.focus-visible-ring;
}

.main {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	width: 100%;
}

.unavailable {
	border-style: dashed;
	background-color: var(--color--background--light-2);

	&:hover {
		box-shadow: none;
	}

	.muted {
		opacity: 0.5;
	}
}

// Lines the button text up with the card content, not its own padding.
.makeAvailable {
	margin-left: calc(-1 * var(--spacing--2xs));
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.description {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}
</style>
