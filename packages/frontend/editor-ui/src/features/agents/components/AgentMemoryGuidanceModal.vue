<script setup lang="ts">
import { ref, watch } from 'vue';
import {
	PongButton,
	PongTagsInput2,
	PongText,
	TagsInputInput,
	type TagsInputValue,
} from '@pong/design-system';
import { useI18n, type BaseTextKey } from '@pong/i18n';
import {
	EPISODIC_MEMORY_GUIDANCE_MAX_TOPICS,
	EPISODIC_MEMORY_GUIDANCE_TOPIC_MAX_LENGTH,
} from '@pong/api-types';
import AgentModal from './modals/AgentModal.vue';

export type AgentMemoryGuidance = { include?: string[]; exclude?: string[] };
type GuidanceField = keyof AgentMemoryGuidance;

const FIELDS: Array<{ key: GuidanceField; label: BaseTextKey }> = [
	{ key: 'include', label: 'agents.builder.memory.episodicMemory.guidance.include.label' },
	{ key: 'exclude', label: 'agents.builder.memory.episodicMemory.guidance.exclude.label' },
];

const props = defineProps<{
	open: boolean;
	guidance: AgentMemoryGuidance | undefined;
	disabled?: boolean;
}>();
const emit = defineEmits<{
	'update:open': [open: boolean];
	save: [guidance: AgentMemoryGuidance | undefined];
}>();

const i18n = useI18n();
const topics = ref<Record<GuidanceField, TagsInputValue[]>>({ include: [], exclude: [] });

// Reset the draft on every open so a dismissed edit is discarded.
watch(
	() => props.open,
	(open) => {
		if (!open) return;
		topics.value = {
			include: [...(props.guidance?.include ?? [])],
			exclude: [...(props.guidance?.exclude ?? [])],
		};
	},
	{ immediate: true },
);

function toTopics(values: TagsInputValue[]): string[] {
	const trimmed = values.filter((value) => typeof value === 'string').map((value) => value.trim());
	return [...new Set(trimmed.filter((topic) => topic.length > 0))];
}

function onSave() {
	const include = toTopics(topics.value.include);
	const exclude = toTopics(topics.value.exclude);
	const isEmpty = include.length === 0 && exclude.length === 0;
	emit('save', isEmpty ? undefined : { include, exclude });
	emit('update:open', false);
}
</script>

<template>
	<AgentModal
		:open="props.open"
		size="medium"
		:title="i18n.baseText('agents.builder.memory.episodicMemory.guidance.title')"
		data-testid="agent-memory-guidance-modal"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.fields">
			<PongText step="sm" color="text-light">
				{{ i18n.baseText('agents.builder.memory.episodicMemory.guidance.description') }}
			</PongText>
			<div v-for="field in FIELDS" :key="field.key" :class="$style.field">
				<PongText step="sm" bold>{{ i18n.baseText(field.label) }}</PongText>
				<PongTagsInput2
					v-model="topics[field.key]"
					:max="EPISODIC_MEMORY_GUIDANCE_MAX_TOPICS"
					:placeholder="i18n.baseText('agents.builder.memory.episodicMemory.guidance.placeholder')"
					:disabled="props.disabled"
					add-on-blur
					:data-testid="`agent-memory-guidance-${field.key}`"
				>
					<template #input="inputProps">
						<TagsInputInput
							v-bind="inputProps"
							:aria-label="i18n.baseText(field.label)"
							:maxlength="EPISODIC_MEMORY_GUIDANCE_TOPIC_MAX_LENGTH"
						/>
					</template>
				</PongTagsInput2>
			</div>
		</div>
		<template #footerActions>
			<PongButton
				:disabled="props.disabled"
				data-testid="agent-memory-guidance-save"
				@click="onSave"
			>
				{{ i18n.baseText('generic.save') }}
			</PongButton>
		</template>
	</AgentModal>
</template>

<style module>
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
