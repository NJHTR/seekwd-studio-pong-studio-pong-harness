<script setup lang="ts">
import { computed } from 'vue';
import { PongButton, PongSettingsRow, PongSettingsRowConfigure, PongText } from '@pong/design-system';
import { type BaseTextKey, useI18n } from '@pong/i18n';
import { useInstanceAiConfiguration } from '../../composables/useInstanceAiConfiguration';
import { SANDBOX_PROVIDER_LABELS } from '../../constants';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ configure: []; enable: [] }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const { sandboxCredentialId, sandboxConfigured } = useInstanceAiConfiguration();

const isEnvironmentManaged = computed(
	() =>
		!store.isProxyEnabled &&
		!store.isCloudManaged &&
		(store.settings?.sandboxEnvConfigured ?? false),
);
const sandboxValue = computed(() => {
	if (isEnvironmentManaged.value) return i18n.baseText('instanceAi.onboarding.foundOnServer');
	if (sandboxCredentialId.value) {
		return store.settings?.sandboxProvider === 'daytona'
			? SANDBOX_PROVIDER_LABELS.daytona
			: SANDBOX_PROVIDER_LABELS['pong-sandbox'];
	}
	return i18n.baseText('settings.pongAgent.sandbox.env.value');
});
const sandboxDescription = computed<{ key: BaseTextKey; warning: boolean }>(() => {
	if (isEnvironmentManaged.value)
		return { key: 'settings.pongAgent.sandbox.env.description', warning: false };
	if (sandboxCredentialId.value)
		return { key: 'settings.pongAgent.sandbox.set.description', warning: false };
	return { key: 'settings.pongAgent.sandbox.missing.description', warning: !props.disabled };
});
</script>

<template>
	<PongSettingsRow
		:title="i18n.baseText('settings.pongAgent.sandbox.label')"
		:clickable="!disabled && sandboxConfigured && !isEnvironmentManaged"
		data-test-id="pong-agent-sandbox-row"
		@click="emit('configure')"
	>
		<template #info>
			<PongText bold size="medium" color="text-dark">
				{{ i18n.baseText('settings.pongAgent.sandbox.label') }}
			</PongText>
			<PongText size="small" :color="sandboxDescription.warning ? 'warning' : 'text-light'">
				{{ i18n.baseText(sandboxDescription.key) }}
			</PongText>
		</template>
		<template v-if="!disabled" #action>
			<PongButton
				v-if="isEnvironmentManaged && !sandboxConfigured"
				variant="solid"
				size="medium"
				:label="i18n.baseText('settings.pongAgent.sandbox.enable')"
				:disabled="store.isSaving"
				data-test-id="pong-agent-sandbox-enable"
				@click="emit('enable')"
			/>
			<PongText
				v-else-if="isEnvironmentManaged"
				size="small"
				color="text-light"
				data-test-id="pong-agent-sandbox-env-value"
			>
				{{ sandboxValue }}
			</PongText>
			<PongButton
				v-else-if="!sandboxConfigured"
				variant="solid"
				size="medium"
				:label="i18n.baseText('settings.pongAgent.sandbox.add')"
				:disabled="store.isSaving"
				data-test-id="pong-agent-sandbox-add"
				@click="emit('configure')"
			/>
			<PongSettingsRowConfigure v-else :value="sandboxValue" />
		</template>
	</PongSettingsRow>
</template>
