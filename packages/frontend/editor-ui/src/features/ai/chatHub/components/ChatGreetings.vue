<script setup lang="ts">
import { truncate } from '@pong/utils/string/truncate';
import { PongHeading, PongLoading } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { type ChatModelDto } from '@pong/api-types';
import { computed } from 'vue';
import { isLlmProviderModel } from '../chat.utils';
import ChatAgentAvatar from './ChatAgentAvatar.vue';
import ChatSuggestedPrompts from './ChatSuggestedPrompts.vue';

const props = defineProps<{
	selectedAgent: ChatModelDto | null;
	loading?: boolean;
}>();

const emit = defineEmits<{
	'select-prompt': [prompt: string];
}>();

const i18n = useI18n();

const isAgentModel = computed(
	() => props.selectedAgent && !isLlmProviderModel(props.selectedAgent.model),
);
</script>

<template>
	<div key="greetings" :class="$style.greetings">
		<template v-if="isAgentModel && selectedAgent">
			<div :class="$style.agentCard">
				<template v-if="loading">
					<PongLoading variant="circle" />
					<PongLoading :rows="1" variant="p" :class="$style.skeletonName" />
				</template>
				<template v-else>
					<ChatAgentAvatar :agent="selectedAgent" size="xl" />
					<PongHeading tag="h2" size="xlarge" :class="$style.agentName">
						{{ truncate(selectedAgent.name, 40) }}
					</PongHeading>
				</template>
				<template v-if="loading">
					<PongLoading
						:rows="3"
						variant="p"
						:shrink-last="false"
						:class="$style.skeletonDescription"
					/>
					<div :class="[$style.suggestions, $style.skeletonPrompts]">
						<PongLoading :rows="1" variant="p" :class="$style.skeletonChip" />
						<PongLoading :rows="1" variant="p" :class="$style.skeletonChip" />
					</div>
				</template>
				<template v-else>
					<p v-if="selectedAgent.description" :class="$style.agentDescription">
						{{ selectedAgent.description }}
					</p>
					<ChatSuggestedPrompts
						v-if="selectedAgent.suggestedPrompts?.length"
						:class="$style.suggestions"
						:prompts="selectedAgent.suggestedPrompts"
						@select="emit('select-prompt', $event)"
					/>
				</template>
			</div>
		</template>
		<template v-else>
			<div :class="$style.header">
				<template v-if="selectedAgent">
					<PongHeading tag="h2">{{ i18n.baseText('chatHub.chat.greeting') }}</PongHeading>
					<ChatAgentAvatar :agent="selectedAgent" size="md" :class="$style.inlineIcon" />
					<PongHeading bold>{{ truncate(selectedAgent.name, 40) }}</PongHeading>
				</template>
				<template v-else>
					<PongHeading tag="h2">{{ i18n.baseText('chatHub.chat.greeting.fallback') }}</PongHeading>
				</template>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.greetings {
	display: flex;
	flex-direction: column;
	align-items: center;
	align-self: center;
}

.agentCard {
	display: flex;
	flex-direction: column;
	align-items: center;
	max-width: 640px;
	text-align: center;
}
.agentName {
	margin-top: var(--spacing--2xs);
	color: var(--color--text--shade-1);
	font-size: 24px;
	font-weight: var(--font-weight--medium);
	line-height: 32px;
}

.agentDescription {
	display: -webkit-box;
	line-clamp: 9;
	-webkit-line-clamp: 8;
	-webkit-box-orient: vertical;
	overflow: hidden;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.suggestions {
	margin-top: var(--spacing--md);
}

.skeletonName {
	width: 160px;
	margin-top: var(--spacing--2xs);
}

.skeletonDescription {
	width: 300px;
	margin-top: var(--spacing--2xs);
}

.skeletonPrompts {
	display: flex;
	gap: var(--spacing--3xs);
	justify-content: center;
}

.skeletonChip {
	width: 140px;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.inlineIcon {
	flex-shrink: 0;
	margin-block: -4px;
}
</style>
