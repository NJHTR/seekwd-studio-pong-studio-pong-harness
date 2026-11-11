<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { AgentSlackSettingsSchema, type AgentSlackIntegrationSettings } from '@pong/api-types';
import { PongSettingsRow, PongSettingsRowGroup, PongSwitch2, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import AgentChannelSlackManagedSettings from '../../components/AgentChannelSlackManagedSettings.vue';
import AgentFormSettingRow from '../../components/AgentFormSettingRow.vue';
import type { AgentChannelViewProps } from '../types';
import type { SlackChannelRuntime } from './useSlackChannelRuntime';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<
	Omit<AgentChannelViewProps, 'runtime'> & { runtime: SlackChannelRuntime }
>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();

const i18n = useI18n();
const savedSlackSettings = computed(
	() => AgentSlackSettingsSchema.safeParse(props.savedSettings).data,
);
const onlyRespondWhenMentioned = ref(false);
watch(
	savedSlackSettings,
	(settings) => {
		onlyRespondWhenMentioned.value = settings?.onlyRespondWhenMentioned ?? false;
	},
	{ immediate: true },
);
const currentSettings = computed<AgentSlackIntegrationSettings | undefined>(() => {
	if (
		onlyRespondWhenMentioned.value === (savedSlackSettings.value?.onlyRespondWhenMentioned ?? false)
	) {
		return savedSlackSettings.value;
	}
	return {
		...savedSlackSettings.value,
		messagingExperience: savedSlackSettings.value?.messagingExperience ?? 'assistant',
		onlyRespondWhenMentioned: onlyRespondWhenMentioned.value,
	};
});
const settingsRef = ref<InstanceType<typeof AgentChannelSlackManagedSettings>>();
const managed = computed(() => props.runtime.isManagedCredential(credentialId.value));
const validationError = computed(() =>
	managed.value ? (settingsRef.value?.validationError ?? null) : null,
);
const loading = computed(
	() => props.loading || props.runtime.loading.value || props.runtime.settingsLoading.value,
);

async function beforeSave() {
	if (!managed.value) return;
	const settings = settingsRef.value?.currentSettings;
	if (!settings || settingsRef.value?.validationError) return;
	await props.runtime.saveSettings(settings);
}

defineExpose({ currentSettings, validationError, loading, beforeSave });
</script>

<template>
	<div :class="$style.editView" tabindex="-1" data-agent-modal-autofocus>
		<AgentIntegrationCredentialConnection
			v-model="credentialId"
			:integration-type="integration.type"
			:integration-label="integration.label"
			:credentials="credentials"
			:credential-permissions="credentialPermissions"
			:credentials-loading="credentialsLoading"
			:disabled="loading"
			:loading="loading"
			:error-message="errorMessage"
			:error-is-conflict="errorIsConflict"
			@create="emit('create')"
			@edit="emit('edit')"
		/>
		<section :class="$style.section" aria-labelledby="slack-conversations-heading">
			<PongText id="slack-conversations-heading" tag="h3" size="medium" bold>
				{{ i18n.baseText('agents.channels.slack.settings.label') }}
			</PongText>
			<PongSettingsRowGroup :class="$style.settingsGroup" data-testid="slack-conversation-settings">
				<PongSettingsRow layout="custom">
					<AgentFormSettingRow
						control-id="slack-only-respond-when-mentioned"
						:title="i18n.baseText('agents.channels.slack.settings.onlyRespondWhenMentioned')"
						:description="
							i18n.baseText('agents.channels.slack.settings.onlyRespondWhenMentionedHint')
						"
					>
						<PongSwitch2
							id="slack-only-respond-when-mentioned"
							v-model="onlyRespondWhenMentioned"
							:aria-label="i18n.baseText('agents.channels.slack.settings.onlyRespondWhenMentioned')"
							:disabled="disabled || loading"
							data-testid="slack-only-respond-when-mentioned"
						/>
					</AgentFormSettingRow>
				</PongSettingsRow>
			</PongSettingsRowGroup>
		</section>
		<section
			v-if="$slots.additionalSettings"
			:class="$style.section"
			aria-labelledby="slack-permissions-heading"
		>
			<PongText id="slack-permissions-heading" tag="h3" size="medium" bold>
				{{ i18n.baseText('agents.channels.slack.settings.permissions') }}
			</PongText>
			<PongSettingsRowGroup :class="$style.settingsGroup" data-testid="slack-permission-settings">
				<PongSettingsRow layout="custom">
					<slot name="additionalSettings" />
				</PongSettingsRow>
			</PongSettingsRowGroup>
		</section>
		<AgentChannelSlackManagedSettings
			v-if="managed"
			ref="settingsRef"
			:settings="runtime.settings.value"
			:loading="runtime.settingsLoading.value"
			:error="runtime.settingsError.value"
			:save-error="runtime.settingsSaveError.value"
			:disabled="loading"
		/>
	</div>
</template>

<style module lang="scss">
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);

	&:focus {
		outline: none;
	}
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.settingsGroup.settingsGroup {
	background: transparent;
	overflow: visible;
}
</style>
