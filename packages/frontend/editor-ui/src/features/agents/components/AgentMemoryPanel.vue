<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogHeader,
	PongDialogTitle,
	PongIconButton,
	PongText,
	PongSwitch,
} from '@pong/design-system';
import { useI18n, type BaseTextKey } from '@pong/i18n';
import { MANAGED_CREDENTIAL_TOKEN } from '@pong/api-types';
import { useSettingsStore } from '@pong/stores/settings.store';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import { AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE } from '../constants';
import { useAgentProjectId } from '../composables/useAgentProjectId';
import AgentMemoryGuidanceModal, { type AgentMemoryGuidance } from './AgentMemoryGuidanceModal.vue';
import AgentPanel from './AgentPanel.vue';

import type { AgentJsonConfig } from '../types';
import shared from '../styles/agent-panel.module.scss';

const props = withDefaults(
	defineProps<{ config: AgentJsonConfig | null; disabled?: boolean; embedded?: boolean }>(),
	{
		disabled: false,
		embedded: false,
	},
);
const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const credentialDialogOpen = ref(false);
const guidanceDialogOpen = ref(false);
const settingsStore = useSettingsStore();
const projectId = useAgentProjectId();
const episodicMemory = computed(() => props.config?.memory?.episodicMemory ?? null);
const episodicMemoryEnabled = computed(() => episodicMemory.value?.enabled === true);
const episodicMemoryGuidance = computed(() => {
	const memory = episodicMemory.value;
	return memory?.enabled === true ? memory.guidance : undefined;
});
const episodicMemoryCredentialId = computed(() => {
	const memory = episodicMemory.value;
	return memory?.enabled === true ? memory.credential : null;
});
const isAiAssistantProxyEnabled = computed(
	() => settingsStore.moduleSettings.agents?.proxyEnabled === true,
);

function buildEnabledMemoryConfig() {
	const existingMemory = props.config?.memory;

	return {
		...existingMemory,
		enabled: true,
		storage: 'pong' as const,
	};
}

function enableEpisodicMemory(credentialId: string) {
	const existingMemory = props.config?.memory;
	const existingEpisodicMemory = existingMemory?.episodicMemory;
	emit('update:config', {
		memory: {
			...buildEnabledMemoryConfig(),
			episodicMemory: {
				...(existingEpisodicMemory?.enabled === true ? existingEpisodicMemory : {}),
				enabled: true,
				credential: credentialId,
			},
		},
	});
}

function disableEpisodicMemory() {
	emit('update:config', {
		memory: {
			...buildEnabledMemoryConfig(),
			episodicMemory: { enabled: false },
		},
	});
}

function onGuidanceSave(guidance: AgentMemoryGuidance | undefined) {
	const existingEpisodicMemory = episodicMemory.value;
	if (existingEpisodicMemory?.enabled !== true) return;
	const { guidance: _, ...rest } = existingEpisodicMemory;
	emit('update:config', {
		memory: {
			...buildEnabledMemoryConfig(),
			episodicMemory: guidance ? { ...rest, guidance } : rest,
		},
	});
}

function onCredentialSelected(credentialId: string) {
	enableEpisodicMemory(credentialId);
	credentialDialogOpen.value = false;
}

function onEpisodicMemoryToggle(enabled: boolean) {
	if (!enabled) {
		disableEpisodicMemory();
		return;
	}

	if (isAiAssistantProxyEnabled.value) {
		enableEpisodicMemory(MANAGED_CREDENTIAL_TOKEN);
		return;
	}

	credentialDialogOpen.value = true;
}
</script>

<template>
	<AgentPanel
		:header="i18n.baseText('agents.builder.memory.title')"
		:description="i18n.baseText('agents.builder.memory.description')"
	>
		<template #header-actions>
			<PongText step="sm" color="text-light">
				{{ i18n.baseText('agents.builder.memory.alwaysOn') }}
			</PongText>
		</template>

		<div :class="shared.settingRow">
			<div :class="shared.settingLabel">
				<PongText step="sm" bold :class="shared.dataEntryLabel">
					{{ i18n.baseText('agents.builder.memory.episodicMemory.label') }}
				</PongText>
				<PongText step="sm" color="text-light">
					{{ i18n.baseText('agents.builder.memory.episodicMemory.hint') }}
				</PongText>
				<PongButton
					v-if="episodicMemoryEnabled && !isAiAssistantProxyEnabled"
					variant="ghost"
					size="small"
					:disabled="props.disabled"
					:class="$style.changeCredentialButton"
					data-testid="agent-episodic-memory-change-credential"
					@click="credentialDialogOpen = true"
				>
					{{
						i18n.baseText('agents.builder.memory.episodicMemory.changeCredential' as BaseTextKey)
					}}
				</PongButton>
			</div>
			<div :class="[shared.settingControl, $style.episodicControls]">
				<PongSwitch
					:model-value="episodicMemoryEnabled"
					:disabled="props.disabled"
					data-testid="agent-episodic-memory-toggle"
					@update:model-value="(value) => onEpisodicMemoryToggle(Boolean(value))"
				/>
				<PongIconButton
					v-if="episodicMemoryEnabled"
					icon="chevron-right"
					variant="ghost"
					size="small"
					:disabled="props.disabled"
					:aria-label="i18n.baseText('agents.builder.memory.episodicMemory.guidance.open')"
					data-testid="agent-episodic-memory-guidance-open"
					@click="guidanceDialogOpen = true"
				/>
			</div>
		</div>
		<AgentMemoryGuidanceModal
			v-model:open="guidanceDialogOpen"
			:guidance="episodicMemoryGuidance"
			:disabled="props.disabled"
			@save="onGuidanceSave"
		/>
		<PongDialog
			:open="credentialDialogOpen"
			size="medium"
			@update:open="credentialDialogOpen = $event"
		>
			<PongDialogHeader>
				<PongDialogTitle>
					{{
						i18n.baseText(
							'agents.builder.memory.episodicMemory.credentialDialog.title' as BaseTextKey,
						)
					}}
				</PongDialogTitle>
			</PongDialogHeader>
			<PongDialogBody>
				<div :class="$style.dialogContent">
					<div :class="$style.row">
						<div :class="$style.titleGroup">
							<PongText step="sm" bold :class="shared.dataEntryLabel">
								{{
									i18n.baseText(
										'agents.builder.memory.episodicMemory.credential.label' as BaseTextKey,
									)
								}}
							</PongText>
							<PongText size="small" color="text-light">
								{{
									i18n.baseText(
										'agents.builder.memory.episodicMemory.credential.hint' as BaseTextKey,
									)
								}}
							</PongText>
						</div>
						<div :class="$style.credentialPicker">
							<!-- Keep the dropdown outside the scrollable dialog body. -->
							<CredentialPicker
								app-name="OpenAI"
								size="medium"
								button-size="large"
								:credential-type="AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE"
								:selected-credential-id="episodicMemoryCredentialId"
								:project-id="projectId"
								:show-delete="false"
								:hide-create-new="false"
								teleported
								credential-modal-append-to-body
								:class="$style.credentialPicker"
								data-testid="agent-episodic-memory-credential-picker"
								@credential-selected="onCredentialSelected"
							/>
						</div>
					</div>
				</div>
			</PongDialogBody>
		</PongDialog>
	</AgentPanel>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	height: 100%;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.titleGroup {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.dialogContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.dialogContent .row {
	flex-direction: column;
	align-items: stretch;
}

.dialogContent .credentialPicker {
	flex-basis: auto;
	width: 100%;
	max-width: none;
	margin-left: 0;
}

.credentialPicker input {
	min-height: 36px;
	height: 36px;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.changeCredentialButton {
	align-self: flex-start;
}

.episodicControls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.credentialPicker {
	display: flex;
	flex: 0 1 280px;
	justify-content: flex-end;
	margin-left: auto;
	min-width: min(280px, 100%);
}

.credentialPicker > * {
	width: 100%;
}
</style>
