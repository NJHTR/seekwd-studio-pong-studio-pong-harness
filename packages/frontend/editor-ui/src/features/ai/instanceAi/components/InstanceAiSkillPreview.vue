<script lang="ts" setup>
import { ref, shallowRef, watch } from 'vue';
import type { SkillDetail } from '@pong/api-types';
import { PongButton, PongHeading, PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import AgentSkillFileNav from '@/features/agents/components/AgentSkillFileNav.vue';
import AgentSkillViewer from '@/features/agents/components/AgentSkillViewer.vue';
import SkillScopeBadge from '@/features/settings/context/components/SkillScopeBadge.vue';
import { useSkillsStore } from '@/features/settings/context/skills.store';
import { useArtifactLinks } from '../artifactLinks';

const SKILL_FILE = 'SKILL.md';

const props = withDefaults(
	defineProps<{
		skillId: string;
		/** Incremented to force a re-fetch when the assistant saves the same skill again. */
		refreshKey?: number;
	}>(),
	{ refreshKey: 0 },
);

const i18n = useI18n();
const skillsStore = useSkillsStore();
const { openArtifactInNewTab } = useArtifactLinks();

const detail = shallowRef<SkillDetail | null>(null);
const selectedPath = ref(SKILL_FILE);
const isLoading = ref(false);
const fetchError = ref(false);

watch(
	() => [props.skillId, props.refreshKey] as const,
	async ([skillId], previous, onCleanup) => {
		let cancelled = false;
		onCleanup(() => {
			cancelled = true;
		});

		// Keep the file the user reads when the same skill reloads after a save.
		const isSameSkill = previous?.[0] === skillId;
		if (!isSameSkill) {
			detail.value = null;
			selectedPath.value = SKILL_FILE;
		}
		isLoading.value = true;
		fetchError.value = false;

		const result = await skillsStore.fetchSkill(skillId).catch(() => null);
		if (cancelled) return;
		isLoading.value = false;
		if (!result) {
			detail.value = null;
			fetchError.value = true;
			return;
		}
		detail.value = result;
		const pathExists =
			selectedPath.value === SKILL_FILE ||
			(result.skill.references ?? []).some((reference) => reference.path === selectedPath.value);
		if (!pathExists) selectedPath.value = SKILL_FILE;
	},
	{ immediate: true },
);

function openInSkillsHub() {
	openArtifactInNewTab('skill', props.skillId);
}
</script>

<template>
	<div :class="$style.content" :aria-busy="isLoading" data-test-id="instance-ai-skill-preview">
		<div v-if="fetchError" :class="$style.centerState">
			<PongText color="text-light">{{
				i18n.baseText('instanceAi.skillPreview.fetchError')
			}}</PongText>
		</div>

		<div
			v-else-if="isLoading && !detail"
			:class="$style.centerState"
			data-test-id="instance-ai-skill-preview-loading"
		>
			<PongIcon icon="loader-circle" :size="80" spin />
		</div>

		<template v-else-if="detail">
			<div :class="$style.header">
				<div :class="$style.titleRow">
					<PongHeading tag="h2" size="large" bold :class="$style.title">{{
						detail.name
					}}</PongHeading>
					<SkillScopeBadge :skill="detail" />
				</div>
				<PongButton
					variant="outline"
					size="small"
					icon="external-link"
					:label="i18n.baseText('instanceAi.skillPreview.openInSkills')"
					data-test-id="instance-ai-skill-preview-open"
					@click="openInSkillsHub"
				/>
			</div>
			<div :class="$style.body">
				<AgentSkillFileNav
					:skill="detail.skill"
					:selected-path="selectedPath"
					read-only
					@select="selectedPath = $event"
				/>
				<AgentSkillViewer
					:class="$style.viewer"
					:skill="detail.skill"
					:selected-path="selectedPath"
					read-only
					@select:path="selectedPath = $event"
				/>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: var(--border);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.title {
	margin: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	display: flex;
	flex: 1;
	min-height: 0;
	overflow: auto;
}

.viewer {
	padding: var(--spacing--sm) var(--spacing--md);
}

.centerState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	height: 100%;
}

@media (max-width: 480px) {
	.body {
		flex-direction: column;
	}
}
</style>
