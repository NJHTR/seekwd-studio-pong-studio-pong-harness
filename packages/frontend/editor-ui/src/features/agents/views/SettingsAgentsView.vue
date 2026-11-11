<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { AgentsSettingsDto } from '@pong/api-types';
import {
	PongButton,
	PongLoading,
	PongPreviewBadge,
	PongSettingsLayout,
	PongSettingsPageHeader,
	PongSettingsRow,
	PongSettingsRowGroup,
	PongSettingsSection,
	PongSwitch,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import { useRootStore } from '@pong/stores/useRootStore';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import AgentsSandboxSettings from '../components/AgentsSandboxSettings.vue';
import { getAgentsSettings, updateAgentsSettings } from '../composables/useAgentApi';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const documentTitle = useDocumentTitle();
const settings = ref<AgentsSettingsDto | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);

function applySettings(value: AgentsSettingsDto) {
	settings.value = value;
	if (settingsStore.moduleSettings.agents) {
		settingsStore.moduleSettings.agents.enabled = value.enabled;
	}
}

async function loadSettings() {
	isLoading.value = true;
	try {
		applySettings(await getAgentsSettings(rootStore.restApiContext));
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.agents.loadError'));
	} finally {
		isLoading.value = false;
	}
}

async function saveEnabled(enabled: boolean) {
	isSaving.value = true;
	try {
		applySettings(await updateAgentsSettings(rootStore.restApiContext, { enabled }));
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.agents.saveError'));
	} finally {
		isSaving.value = false;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.agents'));
	await loadSettings();
});
</script>

<template>
	<PongSettingsLayout data-test-id="agents-settings">
		<PongSettingsPageHeader
			:title="i18n.baseText('settings.agents')"
			:description="i18n.baseText('settings.agents.description')"
			docs-url="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness"
			:docs-label="i18n.baseText('settings.agents.docsLabel')"
			:docs-leading-text="i18n.baseText('settings.agents.docsLeadingText')"
		>
			<template #titleTrailing>
				<PongPreviewBadge size="xsmall" />
			</template>
		</PongSettingsPageHeader>
		<PongLoading v-if="isLoading" :rows="1" :shrink-last="false" />
		<PongSettingsSection v-else-if="settings">
			<PongSettingsRowGroup>
				<PongSettingsRow
					:title="i18n.baseText('settings.agents.enable.label')"
					:description="i18n.baseText('settings.agents.enable.description')"
					:max-description-lines="3"
				>
					<template #action>
						<PongSwitch
							:model-value="settings.enabled"
							:disabled="isSaving"
							:aria-label="i18n.baseText('settings.agents.enable.label')"
							@update:model-value="saveEnabled"
						/>
					</template>
				</PongSettingsRow>
			</PongSettingsRowGroup>
		</PongSettingsSection>
		<PongButton v-else variant="outline" @click="loadSettings">
			{{ i18n.baseText('generic.retry') }}
		</PongButton>
		<AgentsSandboxSettings v-if="settings" />
	</PongSettingsLayout>
</template>
