<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
	PongOption,
	PongSelect,
	PongSettingsRow,
	PongSettingsRowGroup,
	PongSettingsSection,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';

import {
	useOpenWorkflowInAssistantStore,
	type DefaultEditor,
} from '../stores/openWorkflowInAssistant.store';

const store = useOpenWorkflowInAssistantStore();
const i18n = useI18n();
const toast = useToast();

const rootEl = ref<HTMLElement | null>(null);
const highlighted = ref(false);

const selected = computed<DefaultEditor>({
	get: () => store.resolvedDefaultEditor,
	set: (value) => {
		store.saveDefaultEditor(value).catch((error: unknown) => {
			toast.showError(
				error,
				i18n.baseText('experiments.openWorkflowInAssistant.setting.saveError'),
			);
		});
	},
});

onMounted(() => {
	// Consume-on-read: the notification link arms this once, so a reload or
	// back-navigation cannot replay the highlight.
	if (!store.consumeSettingHighlight()) return;
	rootEl.value?.scrollIntoView({ block: 'center' });
	highlighted.value = true;
	setTimeout(() => (highlighted.value = false), 2400);
});
</script>

<template>
	<div
		v-if="store.isTreatment"
		ref="rootEl"
		:class="{ [$style.highlighted]: highlighted }"
		data-test-id="default-editor-setting"
	>
		<PongSettingsSection>
			<PongSettingsRowGroup>
				<PongSettingsRow
					:title="i18n.baseText('experiments.openWorkflowInAssistant.setting.label')"
					:description="i18n.baseText('experiments.openWorkflowInAssistant.setting.description')"
				>
					<template #action>
						<PongSelect v-model="selected" size="small" data-test-id="default-editor-select">
							<PongOption
								value="assistant"
								:label="i18n.baseText('experiments.openWorkflowInAssistant.setting.assistant')"
							/>
							<PongOption
								value="manual"
								:label="i18n.baseText('experiments.openWorkflowInAssistant.setting.manual')"
							/>
						</PongSelect>
					</template>
				</PongSettingsRow>
			</PongSettingsRowGroup>
		</PongSettingsSection>
	</div>
</template>

<style lang="scss" module>
.highlighted {
	border-radius: var(--radius);
	animation: flash 1.2s ease-in-out 2;
}

@keyframes flash {
	50% {
		background-color: var(--color--foreground--tint-1);
	}
}
</style>
