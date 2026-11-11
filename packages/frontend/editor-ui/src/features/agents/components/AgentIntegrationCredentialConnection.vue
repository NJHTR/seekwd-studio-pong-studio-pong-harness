<script setup lang="ts">
import { computed } from 'vue';
import { PongButton, PongIconButton, PongIcon, PongText, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import type { PermissionsRecord } from '@pong/permissions';

import AgentCredentialSelect, { type AgentCredentialOption } from './AgentCredentialSelect.vue';

const props = withDefaults(
	defineProps<{
		integrationType: string;
		integrationLabel: string;
		modelValue?: string;
		credentials: AgentCredentialOption[];
		credentialPermissions: PermissionsRecord['credential'];
		credentialsLoading?: boolean;
		disabled?: boolean;
		connected?: boolean;
		loading?: boolean;
		/** Sets the label at the small size, to sit with the other labels of a stepper. */
		compactLabel?: boolean;
		showConnectButton?: boolean;
		showDisconnectButton?: boolean;
		showEditButton?: boolean;
		errorMessage?: string;
		errorIsConflict?: boolean;
		connectedDescription?: string;
		/**
		 * Force creating a NEW credential instead of picking an existing one: hides
		 * the credential dropdown and offers only "Create new credential". Used by
		 * the AIA channel-setup flow so a new agent always gets its own credential.
		 */
		forceNewCredential?: boolean;
	}>(),
	{
		modelValue: undefined,
		credentialsLoading: false,
		disabled: false,
		connected: false,
		loading: false,
		showConnectButton: false,
		showDisconnectButton: false,
		showEditButton: true,
		errorMessage: '',
		errorIsConflict: false,
		connectedDescription: '',
		forceNewCredential: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [credentialId: string];
	create: [];
	edit: [];
	connect: [];
	disconnect: [];
}>();

const i18n = useI18n();

const canEdit = computed(() => props.showEditButton && !props.connected && !!props.modelValue);
const selectedCredentialName = computed(
	() => props.credentials.find((c) => c.id === props.modelValue)?.name ?? '',
);
const connectDisabled = computed(() => !props.modelValue || props.loading || props.disabled);
</script>

<template>
	<div :class="$style.connectForm">
		<label :class="$style.label">
			<PongText v-bind="compactLabel ? { size: 'small' } : { step: 'sm' }" bold>
				{{ integrationLabel }}
				{{ i18n.baseText('agents.builder.addTrigger.credential') }}
			</PongText>
		</label>
		<PongText
			v-if="connectedDescription"
			:class="$style.connectedDescription"
			size="small"
			:data-testid="`${integrationType}-connected-description`"
		>
			{{ connectedDescription }}
		</PongText>
		<div :class="$style.selectRow">
			<!-- Force-new: no existing-credential dropdown, only create-new (AIA channel setup). -->
			<PongButton
				v-if="forceNewCredential && !modelValue"
				variant="outline"
				size="large"
				:class="$style.select"
				:disabled="disabled"
				:data-testid="`${integrationType}-create-credential-button`"
				@click="emit('create')"
			>
				<template #prefix><PongIcon icon="plus" size="xsmall" /></template>
				{{ i18n.baseText('agents.builder.addTrigger.newCredential') }}
			</PongButton>
			<PongText
				v-else-if="forceNewCredential"
				:class="$style.select"
				size="large"
				:data-testid="`${integrationType}-created-credential-name`"
			>
				{{ selectedCredentialName }}
			</PongText>
			<AgentCredentialSelect
				v-else
				:model-value="modelValue"
				:class="$style.select"
				size="large"
				:placeholder="i18n.baseText('agents.builder.addTrigger.selectCredential')"
				:credentials="credentials"
				:credential-permissions="credentialPermissions"
				:loading="credentialsLoading"
				:disabled="disabled"
				:data-test-id="`${integrationType}-credential-select`"
				@update:model-value="emit('update:modelValue', $event)"
				@create="emit('create')"
			/>
			<PongTooltip v-if="canEdit" :content="i18n.baseText('generic.edit')" placement="top">
				<PongIconButton
					variant="ghost"
					size="large"
					icon-size="medium"
					icon="pen"
					:aria-label="i18n.baseText('agents.builder.addTrigger.editCredential')"
					:data-testid="`${integrationType}-edit-credential`"
					@click="emit('edit')"
				/>
			</PongTooltip>
			<PongButton
				v-if="showDisconnectButton"
				variant="destructive"
				:loading="loading"
				size="large"
				:data-testid="`${integrationType}-disconnect-button`"
				@click="emit('disconnect')"
			>
				<template #prefix><PongIcon icon="unlink" size="xsmall" /></template>
				{{ i18n.baseText('agents.builder.addTrigger.disconnect') }}
			</PongButton>
			<PongButton
				v-if="showConnectButton"
				variant="outline"
				:disabled="connectDisabled"
				:loading="loading"
				size="large"
				:data-testid="`${integrationType}-connect-button`"
				@click="emit('connect')"
			>
				<template #prefix><PongIcon icon="plug" size="xsmall" /></template>
				{{ i18n.baseText('agents.builder.addTrigger.connect') }}
			</PongButton>
		</div>
		<PongText v-if="errorMessage" :class="$style.errorText" size="small">
			{{ errorMessage }}
			<a
				v-if="modelValue && !errorIsConflict"
				:class="$style.link"
				href="#"
				@click.prevent="emit('edit')"
				>{{ i18n.baseText('agents.builder.addTrigger.editCredential') }}</a
			>
		</PongText>
	</div>
</template>

<style module lang="scss">
.connectForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.label {
	display: block;
}

.selectRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.select {
	flex: 1;
	min-width: 0;
}

.connectedDescription {
	color: var(--color--text--tint-1);
}

.errorText {
	color: var(--color--danger);
}

.link {
	color: var(--color--primary);
	text-decoration: underline;
	cursor: pointer;
	margin-left: var(--spacing--4xs);
}
</style>
