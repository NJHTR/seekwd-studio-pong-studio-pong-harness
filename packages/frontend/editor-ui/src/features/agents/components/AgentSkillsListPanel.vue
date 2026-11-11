<script setup lang="ts">
import { computed, useId } from 'vue';
import {
	PongButton,
	PongIcon,
	PongIconButton,
	PongText,
	PongTooltip,
	PongCard,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import type { AgentSkill } from '../types';
import AgentPanelHeader from './AgentPanelHeader.vue';

const props = withDefaults(
	defineProps<{
		skills: Array<{ id: string; skill: AgentSkill }>;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'open-skill': [id: string];
	'add-skill': [];
	'remove-skill': [id: string];
}>();

const i18n = useI18n();
const headerId = useId();

const totalCount = computed(() => props.skills.length);
</script>

<template>
	<div
		:class="[$style.panel, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
		data-testid="agent-skills-list-panel"
	>
		<AgentPanelHeader
			:class="$style.header"
			:header-id="headerId"
			:title="i18n.baseText('agents.builder.skills.title')"
			:description="
				i18n.baseText('agents.builder.skills.count', {
					adjustToNumber: totalCount,
					interpolate: { count: String(totalCount) },
				})
			"
		>
			<template #actions>
				<PongButton
					size="small"
					:disabled="props.disabled"
					data-testid="agent-skills-add"
					@click="emit('add-skill')"
				>
					<template #prefix><PongIcon icon="plus" :size="14" /></template>
					{{ i18n.baseText('agents.builder.skills.add') }}
				</PongButton>
			</template>
		</AgentPanelHeader>

		<div v-if="totalCount === 0" :class="$style.empty">
			<PongText size="small" color="text-light">{{
				i18n.baseText('agents.builder.skills.empty')
			}}</PongText>
		</div>

		<div v-else :class="$style.rows">
			<PongCard
				v-for="{ id, skill } in skills"
				:key="id"
				:class="$style.row"
				hoverable
				role="button"
				tabindex="0"
				data-testid="agent-skills-list-row"
				@click="emit('open-skill', id)"
				@keydown.enter.prevent="emit('open-skill', id)"
				@keydown.space.prevent="emit('open-skill', id)"
			>
				<template #prepend>
					<PongIcon icon="sparkles" :size="14" :class="$style.skillIcon" />
				</template>

				<PongText size="small" color="text-dark" :class="$style.name">{{
					skill.name || id
				}}</PongText>
				<PongText
					v-if="skill.description"
					size="small"
					color="text-light"
					:class="$style.description"
					>{{ skill.description }}</PongText
				>

				<template #append>
					<PongTooltip :content="i18n.baseText('agents.builder.skills.remove')" placement="top">
						<PongIconButton
							icon="trash-2"
							variant="ghost"
							text
							:aria-label="i18n.baseText('agents.builder.skills.remove')"
							data-testid="agent-skills-list-remove"
							@click.stop="emit('remove-skill', id)"
						/>
					</PongTooltip>
				</template>
			</PongCard>
		</div>
	</div>
</template>

<style module lang="scss">
.panel.disabled > :not(.header) {
	pointer-events: none;
	opacity: 0.6;
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	height: 100%;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.empty {
	padding: var(--spacing--lg);
	text-align: center;
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	--card--append--width: auto;

	:global(.pong-card-append) {
		gap: var(--spacing--2xs);
	}
}

.skillIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.name {
	font-weight: var(--font-weight--medium);
	margin-bottom: var(--spacing--4xs);
}

.name,
.description {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	max-width: 80%;
}

.chevron {
	color: var(--text-color--subtler);
	flex-shrink: 0;
}
</style>
