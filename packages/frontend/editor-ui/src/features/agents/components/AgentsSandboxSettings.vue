<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
	PongButton,
	PongLink,
	PongLoading,
	PongSettingsRow,
	PongSettingsRowGroup,
	PongSettingsSection,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ConnectionDialog from '@/features/ai/instanceAi/components/settings/ConnectionDialog.vue';
import SandboxSettingsRow from '@/features/ai/instanceAi/components/settings/SandboxSettingsRow.vue';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';

const i18n = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const sandboxStore = useInstanceAiSettingsStore();
const isLoading = ref(true);
const hasLoaded = ref(false);
const dialogOpen = ref(false);

const hasSettingsModule = computed(() => settingsStore.isModuleActive('instance-ai'));
const isCloudManaged = computed(
	() => settingsStore.isCloudDeployment || sandboxStore.isCloudManaged,
);
const connectionDescription = computed(() => {
	if (isCloudManaged.value) return i18n.baseText('instanceAi.onboarding.sandbox.description');
	if (!hasSettingsModule.value) return i18n.baseText('settings.agents.sandbox.moduleDisabled');
	return i18n.baseText('settings.agents.sandbox.loadError');
});

async function loadSettings() {
	isLoading.value = true;
	try {
		if (hasSettingsModule.value && !isCloudManaged.value) {
			const [settingsLoaded] = await Promise.all([
				sandboxStore.fetch(),
				credentialsStore.fetchCredentialTypes(false),
			]);
			hasLoaded.value = settingsLoaded && sandboxStore.settings !== null;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.agents.sandbox.loadError'));
	} finally {
		isLoading.value = false;
	}
}

async function enableEnvironmentSandbox() {
	sandboxStore.setField('sandboxEnabled', true);
	await sandboxStore.save();
}

onMounted(loadSettings);
</script>

<template>
	<PongSettingsSection
		:title="i18n.baseText('settings.agents.sandbox.title')"
		:description="i18n.baseText('settings.agents.sandbox.description')"
	>
		<PongLoading v-if="isLoading" :rows="1" :shrink-last="false" />
		<PongSettingsRowGroup v-else>
			<SandboxSettingsRow
				v-if="hasSettingsModule && !isCloudManaged && hasLoaded"
				@configure="dialogOpen = true"
				@enable="enableEnvironmentSandbox"
			/>
			<PongSettingsRow
				v-else
				:title="i18n.baseText('settings.pongAgent.sandbox.label')"
				:description="connectionDescription"
				:max-description-lines="3"
			>
				<template #action>
					<PongText v-if="isCloudManaged" size="small" color="text-light">
						{{ i18n.baseText('settings.agents.sandbox.cloudManaged') }}
					</PongText>
					<PongLink
						v-else-if="!hasSettingsModule"
						href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness"
						target="_blank"
					>
						{{ i18n.baseText('settings.agents.docsLabel') }}
					</PongLink>
					<PongButton v-else variant="outline" @click="loadSettings">
						{{ i18n.baseText('generic.retry') }}
					</PongButton>
				</template>
			</PongSettingsRow>
		</PongSettingsRowGroup>
		<ConnectionDialog v-if="dialogOpen" v-model:open="dialogOpen" kind="sandbox" />
	</PongSettingsSection>
</template>
