<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
	PongBadge,
	PongButton,
	PongCallout,
	PongEmptyState,
	PongEnterpriseReadinessBadge,
	PongExternalLink,
	PongLoading,
	PongOption,
	PongSelect,
	PongSettingsLayout,
	PongSettingsPageHeader,
	PongSettingsRow,
	PongSettingsRowConfigure,
	PongSettingsRowGroup,
	PongSettingsSection,
	PongSwitch,
	PongText,
	type EmptyStateIconCards,
} from '@pong/design-system';
import {
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type InstanceAiPermissions,
	type InstanceAiPermissionMode,
} from '@pong/api-types';
import { type BaseTextKey, useI18n } from '@pong/i18n';
import { useTelemetry } from '@pong/composables/useTelemetry';
import { useToast } from '@pong/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
// Experiment cleanup: remove with openWorkflowInAssistant.
import DefaultEditorSetting from '@/experiments/openWorkflowInAssistant/components/DefaultEditorSetting.vue';
import { isContextSkillsEnabled } from '@/features/settings/context/context.utils';
import { useInstanceAiConfiguration } from '../composables/useInstanceAiConfiguration';
import { useInstanceCredentialTest } from '../composables/useInstanceCredentialTest';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSetupPageViewTelemetry } from '../instanceAiSetup.telemetry';
import type { InstanceAiConnectionKind } from '../constants';
import ConnectionDialog from '../components/settings/ConnectionDialog.vue';
import SandboxSettingsRow from '../components/settings/SandboxSettingsRow.vue';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const message = useMessage();
const toast = useToast();
const telemetry = useTelemetry();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const store = useInstanceAiSettingsStore();
const { isTestingCredential, testSavedCredential } = useInstanceCredentialTest();
const {
	modelCredential,
	modelConfigured: isModelConfigured,
	sandboxCredentialId,
	sandboxConfigured: isSandboxConfigured,
	searchCredential,
	searchState,
} = useInstanceAiConfiguration();

const DOCS_URL = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
const DATA_SHARING_DOCS_URL =
	'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

const isAdmin = computed(() => store.canManage);
const isEnabled = computed(
	() => store.settings?.enabled ?? settingsStore.moduleSettings?.['instance-ai']?.enabled ?? false,
);
const isOff = computed(() => !isEnabled.value);
const isMcpAccessEnabled = computed(() => store.settings?.mcpAccessEnabled ?? true);
const isSelfManaged = computed(() => !store.isProxyEnabled && !store.isCloudManaged);
const showCredentialsRows = computed(() => isAdmin.value && isSelfManaged.value);
const showSandboxRow = computed(() => isAdmin.value && !store.isCloudManaged);
const isModelConnectionEnvManaged = computed(
	() =>
		isSelfManaged.value &&
		(store.settings?.envManaged?.model.provider ?? store.settings?.modelEnvConfigured ?? false),
);
const isModelNameEnvManaged = computed(
	() => isSelfManaged.value && (store.settings?.envManaged?.model.model ?? false),
);
const isModelReadOnly = computed(
	() => isModelConnectionEnvManaged.value && isModelNameEnvManaged.value,
);
const isSandboxEnvManaged = computed(
	() => isSelfManaged.value && (store.settings?.sandboxEnvConfigured ?? false),
);
const isSearchEnvManaged = computed(
	() => isSelfManaged.value && (store.settings?.searchEnvConfigured ?? false),
);

const modelValue = computed(() => {
	if (isModelConnectionEnvManaged.value)
		return i18n.baseText('instanceAi.onboarding.foundOnServer');
	if (store.settings?.modelCredentialId) {
		const typeLabel = modelCredential.value ? credentialTypeLabel(modelCredential.value.type) : '';
		const modelName = store.settings.modelName ?? '';
		return [typeLabel, modelName].filter(Boolean).join(' · ');
	}
	return i18n.baseText('settings.pongAgent.modelCredential.env.value');
});
const modelDescription = computed<{ key: BaseTextKey; warning: boolean } | null>(() => {
	if (isModelConnectionEnvManaged.value)
		return { key: 'settings.pongAgent.modelCredential.env.description', warning: false };
	if ((store.settings?.modelCredentialId && store.settings.modelName) || isOff.value) return null;
	return { key: 'settings.pongAgent.modelCredential.missing.description', warning: true };
});

const searchValue = computed(() => {
	if (isSearchEnvManaged.value) return i18n.baseText('instanceAi.onboarding.foundOnServer');
	if (searchState.value === 'disabled') return i18n.baseText('instanceAi.onboarding.disabled');
	return searchCredential.value ? credentialTypeLabel(searchCredential.value.type) : '';
});

/** Mirrors the backend `setupCompleted`: only a direct self-managed instance needs setup. */
const isSetupComplete = computed(
	() =>
		!showCredentialsRows.value ||
		(isModelConfigured.value && isSandboxConfigured.value && searchState.value !== 'notset'),
);
const neverConfigured = computed(() => {
	if (isEnabled.value) return false;
	if (!isSelfManaged.value || !store.settings) return true;
	return !isModelConfigured.value && !isSandboxConfigured.value && searchState.value === 'notset';
});

const emptyStateIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'sparkles',
	sides: ['workflow', 'message-square', 'search', 'bot'],
};

const PERMISSION_OPTIONS: InstanceAiPermissionMode[] = [
	'require_approval',
	'always_allow',
	'blocked',
];

const PREFERENCE_PERMISSION_OPTIONS: InstanceAiPermissionMode[] = ['always_allow', 'blocked'];

const PERMISSION_OPTION_LABEL: Record<InstanceAiPermissionMode, BaseTextKey> = {
	require_approval: 'settings.pongAgent.permissions.needsApproval',
	always_allow: 'settings.pongAgent.permissions.alwaysAllow',
	blocked: 'settings.pongAgent.permissions.blocked',
};

interface PermissionGroup {
	id: string;
	labelKey: BaseTextKey;
	descriptionKey?: BaseTextKey;
	keys: Array<keyof InstanceAiPermissions>;
}

const PERMISSION_GROUPS: PermissionGroup[] = [
	{
		id: 'workflows',
		labelKey: 'settings.pongAgent.permissions.group.workflows',
		keys: [
			'createWorkflow',
			'updateWorkflow',
			'runWorkflow',
			'publishWorkflow',
			'deleteWorkflow',
			'restoreWorkflowVersion',
			'tagWorkflow',
			'moveWorkflowToFolder',
		],
	},
	{
		id: 'nodes',
		labelKey: 'settings.pongAgent.permissions.group.nodes',
		keys: ['executeNode'],
	},
	{
		id: 'folders',
		labelKey: 'settings.pongAgent.permissions.group.folders',
		keys: ['createFolder', 'deleteFolder'],
	},
	{
		id: 'dataTables',
		labelKey: 'settings.pongAgent.permissions.group.dataTables',
		keys: ['createDataTable', 'mutateDataTableSchema', 'mutateDataTableRows'],
	},
	{
		id: 'credentials',
		labelKey: 'settings.pongAgent.permissions.group.credentials',
		keys: ['createCredential', 'deleteCredential'],
	},
	{
		id: 'system',
		labelKey: 'settings.pongAgent.permissions.group.system',
		keys: ['cleanupTestExecutions'],
	},
	{
		id: 'web',
		labelKey: 'settings.pongAgent.permissions.group.web',
		keys: ['fetchUrl', 'webSearch'],
	},
	{
		id: 'mcp',
		labelKey: 'settings.pongAgent.permissions.group.mcp',
		descriptionKey: 'settings.pongAgent.permissions.group.mcpDescription',
		keys: ['mcpRead', 'mcpWrite'],
	},
	{
		id: 'preferences',
		labelKey: 'settings.pongAgent.permissions.group.preferences',
		keys: ['createPreference'],
	},
];

const SKILLS_PERMISSION_GROUP: PermissionGroup = {
	id: 'skills',
	labelKey: 'settings.pongAgent.permissions.group.skills',
	keys: ['createSkill', 'updateSkill', 'deleteSkill'],
};

const permissionGroups = computed(() => [
	...PERMISSION_GROUPS,
	...(isContextSkillsEnabled() ? [SKILLS_PERMISSION_GROUP] : []),
]);

const expandedGroups = reactive<Record<string, boolean>>({});

function isGroupLocked(group: PermissionGroup) {
	return isOff.value || (group.id === 'mcp' && !isMcpAccessEnabled.value);
}

function groupSummary(group: PermissionGroup) {
	if (group.id === 'mcp' && !isMcpAccessEnabled.value)
		return i18n.baseText('settings.pongAgent.permissions.group.mcpDisabled');
	// Each key has its own default, so compare against that one. Comparing
	// against `require_approval` counts an untouched Preferences group, whose
	// default is `always_allow`, as an exception.
	const exceptions = group.keys.filter(
		(key) => store.getPermission(key) !== DEFAULT_INSTANCE_AI_PERMISSIONS[key],
	).length;
	if (exceptions === 0) return i18n.baseText('settings.pongAgent.permissions.group.default');
	if (exceptions === 1) return i18n.baseText('settings.pongAgent.permissions.group.exception');
	return i18n.baseText('settings.pongAgent.permissions.group.exceptions', {
		interpolate: { count: exceptions },
	});
}

function permissionOptionsFor(key: keyof InstanceAiPermissions) {
	if (key === 'createPreference') return PREFERENCE_PERMISSION_OPTIONS;
	return PERMISSION_OPTIONS;
}

/** Exactly one dialog can be active; transitions between steps never observe an all-closed state. */
const activeDialog = ref<InstanceAiConnectionKind | null>(null);
/** True while walking through the missing setup items, so saving one dialog opens the next. */
const setupChain = ref(false);
/** The switch shows on while the walkthrough runs; `enabled` is saved only once setup is complete. */
const isEnabling = ref(false);
const isSwitchOn = computed(() => isEnabled.value || isEnabling.value);
/** Saved credentials that turning on still has to test. Each one is tested at most once. */
let credentialsToTest = new Set<'model' | 'sandbox'>();

function setDialogOpen(kind: InstanceAiConnectionKind, isOpen: boolean) {
	if (isOpen) {
		activeDialog.value = kind;
	} else if (activeDialog.value === kind) {
		// Dialogs in the walkthrough don't close themselves, so this is a cancel.
		activeDialog.value = null;
		setupChain.value = false;
		isEnabling.value = false;
	}
}

function openModelDialog() {
	if (isModelReadOnly.value) return;
	setupChain.value = false;
	activeDialog.value = 'model';
}

function openSandboxDialog() {
	if (isSandboxEnvManaged.value) return;
	setupChain.value = false;
	activeDialog.value = 'sandbox';
}

function openSearchDialog() {
	if (isSearchEnvManaged.value) return;
	setupChain.value = false;
	activeDialog.value = 'search';
}

/** A saved credential can stop working, so turning on tests it once. Other paths skip the test. */
async function savedCredentialWorks(kind: 'model' | 'sandbox'): Promise<boolean> {
	if (!isEnabling.value || !credentialsToTest.delete(kind)) return true;
	if (kind === 'model') {
		const id = store.settings?.modelCredentialId;
		const credential = modelCredential.value;
		if (!id) return true;
		return !!credential && (await testSavedCredential(id, credential.name, credential.type));
	}
	if (!sandboxCredentialId.value) return true;
	const type = store.settings?.sandboxProvider === 'daytona' ? 'daytonaApi' : 'httpHeaderAuth';
	return await testSavedCredential(sandboxCredentialId.value, 'pong Assistant sandbox', type);
}

async function nextSetupDialog(): Promise<InstanceAiConnectionKind | null> {
	if (
		showCredentialsRows.value &&
		(!isModelConfigured.value || !(await savedCredentialWorks('model')))
	) {
		return 'model';
	}
	// An environment-configured sandbox has no dialog. It only needs to be switched on.
	if (!(await enableEnvironmentSandboxIfNeeded())) return null;
	if (
		showSandboxRow.value &&
		!isSandboxEnvManaged.value &&
		(!isSandboxConfigured.value || !(await savedCredentialWorks('sandbox')))
	) {
		return 'sandbox';
	}
	if (showCredentialsRows.value && searchState.value === 'notset') return 'search';
	return null;
}

/**
 * Opens the dialog for the first missing setup item. When none is left, it closes the
 * walkthrough and saves a pending switch-on.
 */
async function continueSetup() {
	setupChain.value = true;
	const next = await nextSetupDialog();
	if (!setupChain.value) return;
	setupChain.value = next !== null;
	activeDialog.value = next;
	// The admin saves this credential in its dialog, so the walkthrough does not test it again.
	if (next === 'model' || next === 'sandbox') credentialsToTest.delete(next);
	if (next !== null || !isEnabling.value) return;
	if (isSetupComplete.value) await store.persistEnabled(true);
	isEnabling.value = false;
}

async function handleDialogSaved() {
	if (setupChain.value) await continueSetup();
}

function credentialTypeLabel(type: string) {
	return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
}

async function enableEnvironmentSandboxIfNeeded(): Promise<boolean> {
	if (!isSandboxEnvManaged.value || isSandboxConfigured.value) return true;
	store.setField('sandboxEnabled', true);
	return await store.save();
}

useSetupPageViewTelemetry('settings');

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.pongAgent'));
	void store.fetch();
	void credentialsStore.fetchCredentialTypes(false);
});

async function enable() {
	credentialsToTest = new Set(
		showCredentialsRows.value && store.canManageInstanceCredentials ? ['model', 'sandbox'] : [],
	);
	if (isSetupComplete.value && credentialsToTest.size === 0) {
		await store.persistEnabled(true);
		return;
	}
	isEnabling.value = true;
	await continueSetup();
}

async function handleEnabledToggle(value: boolean) {
	if (value) {
		await enable();
		return;
	}

	const confirmed = await message.confirm(
		i18n.baseText('settings.pongAgent.status.disable.description'),
		{
			title: i18n.baseText('settings.pongAgent.status.disable.title'),
			confirmButtonText: i18n.baseText('settings.pongAgent.status.disable'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed === MODAL_CONFIRM) await store.persistEnabled(false);
}

function handleBrowserUseToggle(value: boolean) {
	store.setField('browserUseEnabled', value);
	void store.save();
}

function handleMcpAccessToggle(value: boolean) {
	store.setField('mcpAccessEnabled', value);
	void store.save();
}

function handlePermissionChange(key: keyof InstanceAiPermissions, value: InstanceAiPermissionMode) {
	store.setPermission(key, value);
	void store.save();
}

// Data sharing is an instance-wide AI setting, not part of the assistant's own
// settings, so it is read and saved through the settings store.
const isDataSharingEnabled = computed(() => settingsStore.isAiDataSharingEnabled);
const isSavingDataSharing = ref(false);
const canToggleDataSharing = computed(
	() =>
		!isOff.value &&
		store.canManageAiUsage &&
		!isDataSharingEnabled.value &&
		!isSavingDataSharing.value,
);

// The setting is deprecated: it can only be turned on, so the switch locks once it is.
async function handleDataSharingToggle(value: boolean) {
	if (!value || !canToggleDataSharing.value) return;

	isSavingDataSharing.value = true;
	try {
		await settingsStore.updateAiDataSharingSettings(true);
		toast.showMessage({ title: i18n.baseText('settings.ai.updated.success'), type: 'success' });
		telemetry.track('User changed AI Usage settings', { allow_sending_parameter_values: true });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.ai.updated.error'));
	} finally {
		isSavingDataSharing.value = false;
	}
}
</script>

<template>
	<PongSettingsLayout data-test-id="pong-agent-settings">
		<PongSettingsPageHeader
			:title="i18n.baseText('settings.pongAgent')"
			:description="i18n.baseText('settings.pongAgent.description')"
			:docs-url="DOCS_URL"
			:docs-label="i18n.baseText('settings.pongAgent.docsLabel')"
		>
			<template v-if="settingsStore.isEnterprisePlan" #titleTrailing>
				<PongEnterpriseReadinessBadge
					size="xsmall"
					data-test-id="pong-agent-enterprise-readiness-badge"
				/>
			</template>
		</PongSettingsPageHeader>

		<PongLoading v-if="store.isLoading" :rows="3" :shrink-last="false" />

		<PongEmptyState
			v-else-if="neverConfigured"
			:icon="emptyStateIcon"
			:heading="i18n.baseText('settings.pongAgent.empty.title')"
			:description="i18n.baseText('settings.pongAgent.empty.description')"
			:button-text="isAdmin ? i18n.baseText('settings.pongAgent.empty.enable') : undefined"
			:button-disabled="store.isSaving || isEnabling || isTestingCredential"
			button-variant="solid"
			@click:button="enable"
		>
			<template v-if="isAdmin" #additionalContent>
				<PongText size="small" color="text-light">
					{{ i18n.baseText('settings.pongAgent.empty.footnote') }}
				</PongText>
			</template>
		</PongEmptyState>

		<template v-else-if="isAdmin">
			<PongSettingsSection>
				<PongSettingsRowGroup>
					<PongSettingsRow
						:title="i18n.baseText('settings.pongAgent.enable.label')"
						:description="i18n.baseText('settings.pongAgent.enable.description')"
					>
						<template #action>
							<PongSwitch
								:model-value="isSwitchOn"
								:disabled="store.isSaving || isEnabling || isTestingCredential"
								:aria-label="i18n.baseText('settings.pongAgent.enable.label')"
								data-test-id="pong-agent-enable-toggle"
								@update:model-value="handleEnabledToggle"
							/>
						</template>
					</PongSettingsRow>

					<PongSettingsRow
						v-if="showCredentialsRows"
						:class="{ [$style.dim]: isOff }"
						:clickable="!isOff && isModelConfigured && !isModelReadOnly"
						data-test-id="pong-agent-model-row"
						@click="openModelDialog"
					>
						<template #info>
							<PongText bold size="medium" color="text-dark">
								{{ i18n.baseText('settings.pongAgent.modelCredential.label') }}
							</PongText>
							<PongText
								v-if="modelDescription"
								size="small"
								:color="modelDescription.warning ? 'warning' : 'text-light'"
							>
								{{ i18n.baseText(modelDescription.key) }}
							</PongText>
						</template>
						<template v-if="!isOff" #action>
							<PongButton
								v-if="!isModelConfigured"
								variant="solid"
								size="medium"
								:label="i18n.baseText('settings.pongAgent.modelCredential.add')"
								:disabled="store.isSaving"
								data-test-id="pong-agent-model-add"
								@click="continueSetup"
							/>
							<PongText
								v-else-if="isModelReadOnly"
								size="small"
								color="text-light"
								data-test-id="pong-agent-model-env-value"
							>
								{{ modelValue }}
							</PongText>
							<PongSettingsRowConfigure v-else :value="modelValue" />
						</template>
					</PongSettingsRow>

					<SandboxSettingsRow
						v-if="showSandboxRow"
						:class="{ [$style.dim]: isOff }"
						:disabled="isOff"
						@configure="openSandboxDialog"
						@enable="enableEnvironmentSandboxIfNeeded"
					/>
				</PongSettingsRowGroup>
			</PongSettingsSection>

			<!-- Experiment cleanup: remove with openWorkflowInAssistant. -->
			<DefaultEditorSetting />

			<PongSettingsSection
				:class="{ [$style.dim]: isOff }"
				:title="i18n.baseText('settings.pongAgent.capabilities.title')"
				:description="i18n.baseText('settings.pongAgent.capabilities.description')"
			>
				<PongSettingsRowGroup>
					<PongSettingsRow
						v-if="showCredentialsRows"
						:clickable="!isOff && searchState !== 'notset' && !isSearchEnvManaged"
						data-test-id="pong-agent-search-row"
						@click="openSearchDialog"
					>
						<template #info>
							<span :class="$style.titleWithTag">
								<PongText bold size="medium" color="text-dark">
									{{ i18n.baseText('settings.pongAgent.search.label') }}
								</PongText>
								<PongBadge variant="success" size="xsmall">
									{{ i18n.baseText('settings.pongAgent.search.recommended') }}
								</PongBadge>
							</span>
							<PongText size="small" color="text-light">
								{{
									searchState === 'env'
										? i18n.baseText('settings.pongAgent.search.env.description')
										: i18n.baseText('settings.pongAgent.search.description')
								}}
							</PongText>
						</template>
						<template v-if="!isOff" #action>
							<PongButton
								v-if="searchState === 'notset'"
								variant="outline"
								size="medium"
								:label="i18n.baseText('settings.pongAgent.search.setup')"
								:disabled="store.isSaving"
								data-test-id="pong-agent-search-setup"
								@click="openSearchDialog"
							/>
							<PongText
								v-else-if="isSearchEnvManaged"
								size="small"
								color="text-light"
								data-test-id="pong-agent-search-env-value"
							>
								{{ searchValue }}
							</PongText>
							<PongSettingsRowConfigure v-else :value="searchValue" />
						</template>
					</PongSettingsRow>

					<PongSettingsRow
						:title="i18n.baseText('settings.pongAgent.browserUse.label')"
						:description="i18n.baseText('settings.pongAgent.browserUse.description')"
					>
						<template #action>
							<PongSwitch
								:model-value="!isOff && (store.settings?.browserUseEnabled ?? true)"
								:disabled="store.isSaving || isOff"
								:aria-label="i18n.baseText('settings.pongAgent.browserUse.label')"
								data-test-id="pong-agent-browser-use-toggle"
								@update:model-value="handleBrowserUseToggle"
							/>
						</template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</PongSettingsSection>

			<PongSettingsSection
				:class="{ [$style.dim]: isOff }"
				:title="i18n.baseText('settings.pongAgent.mcp.title')"
				:description="i18n.baseText('settings.pongAgent.mcp.description')"
			>
				<PongSettingsRowGroup>
					<PongSettingsRow
						:title="i18n.baseText('settings.pongAgent.mcpAccess.label')"
						:description="i18n.baseText('settings.pongAgent.mcpAccess.description')"
					>
						<template #action>
							<PongSwitch
								:model-value="!isOff && isMcpAccessEnabled"
								:disabled="store.isSaving || isOff"
								:aria-label="i18n.baseText('settings.pongAgent.mcpAccess.label')"
								data-test-id="pong-agent-mcp-access-toggle"
								@update:model-value="handleMcpAccessToggle"
							/>
						</template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</PongSettingsSection>

			<PongSettingsSection
				:class="{ [$style.dim]: isOff }"
				:title="i18n.baseText('settings.pongAgent.permissions.title')"
				:description="i18n.baseText('settings.pongAgent.permissions.description')"
			>
				<PongSettingsRowGroup>
					<PongSettingsRow
						v-for="group in permissionGroups"
						:key="group.id"
						v-model="expandedGroups[group.id]"
						:class="{ [$style.dim]: !isOff && isGroupLocked(group) }"
						:title="i18n.baseText(group.labelKey)"
						:expandable="!isGroupLocked(group)"
						:expand-label="groupSummary(group)"
						:collapse-label="groupSummary(group)"
						:data-test-id="`pong-agent-permission-group-${group.id}`"
					>
						<template v-if="isGroupLocked(group)" #action>
							<PongText size="small" color="text-light">{{ groupSummary(group) }}</PongText>
						</template>
						<template #expanded>
							<div :class="$style.permissionList">
								<PongText
									v-if="group.descriptionKey"
									:class="$style.permissionDescription"
									size="small"
									color="text-light"
								>
									{{ i18n.baseText(group.descriptionKey) }}
								</PongText>
								<div v-for="key in group.keys" :key="key" :class="$style.permissionRow">
									<PongText size="small" color="text-dark">
										{{ i18n.baseText(`settings.pongAgent.permissions.${key}` as BaseTextKey) }}
									</PongText>
									<PongSelect
										:class="$style.permissionSelect"
										:model-value="store.getPermission(key)"
										size="small"
										:disabled="store.isSaving || isGroupLocked(group)"
										:data-test-id="`pong-agent-permission-${key}`"
										@update:model-value="
											handlePermissionChange(key, $event as InstanceAiPermissionMode)
										"
									>
										<PongOption
											v-for="option in permissionOptionsFor(key)"
											:key="option"
											:value="option"
											:label="i18n.baseText(PERMISSION_OPTION_LABEL[option])"
										/>
									</PongSelect>
								</div>
							</div>
						</template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</PongSettingsSection>

			<PongSettingsSection
				:class="{ [$style.dim]: isOff }"
				:title="i18n.baseText('settings.pongAgent.dataSharing.title')"
			>
				<template #description>
					<PongText size="small" color="text-base">
						{{ i18n.baseText('settings.pongAgent.dataSharing.description') }}
						<!-- Same docs phrase as PongSettingsPageHeader: lead-in, inline external link, icon. -->
						<span :class="$style.docsPhrase">
							{{ i18n.baseText('settings.pongAgent.dataSharing.docsLeadingText') }}
							<PongExternalLink
								inline
								size="xsmall"
								:href="DATA_SHARING_DOCS_URL"
								data-test-id="pong-agent-data-sharing-docs-link"
							>
								{{ i18n.baseText('settings.pongAgent.dataSharing.docsLabel') }}
							</PongExternalLink>
						</span>
					</PongText>
				</template>
				<PongSettingsRowGroup>
					<PongSettingsRow
						:title="i18n.baseText('settings.ai.allowSendingSchema.label')"
						:description="i18n.baseText('settings.ai.allowSendingSchema.description')"
						data-test-id="pong-agent-data-sharing-schema-row"
					>
						<template #action>
							<PongSwitch
								:model-value="!isOff"
								disabled
								:aria-label="i18n.baseText('settings.ai.allowSendingSchema.label')"
								data-test-id="pong-agent-data-sharing-schema-toggle"
							/>
						</template>
					</PongSettingsRow>
					<PongSettingsRow
						:title="i18n.baseText('settings.ai.allowSendingParameterValues.label')"
						:description="i18n.baseText('settings.pongAgent.dataSharing.values.description')"
						data-test-id="pong-agent-data-sharing-values-row"
					>
						<template #action>
							<PongSwitch
								:model-value="!isOff && isDataSharingEnabled"
								:disabled="!canToggleDataSharing"
								:aria-label="i18n.baseText('settings.ai.allowSendingParameterValues.label')"
								data-test-id="pong-agent-data-sharing-values-toggle"
								@update:model-value="handleDataSharingToggle"
							/>
						</template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
				<PongCallout
					v-if="!isDataSharingEnabled"
					theme="warning"
					data-test-id="pong-agent-data-sharing-deprecation-notice"
				>
					{{ i18n.baseText('settings.ai.allowSendingParameterValues.deprecated') }}
					<template v-if="!settingsStore.isCloudDeployment">
						{{ i18n.baseText('settings.ai.allowSendingParameterValues.deprecated.envVar') }}
					</template>
				</PongCallout>
			</PongSettingsSection>
		</template>

		<!-- Experiment cleanup: remove with openWorkflowInAssistant. Members see
		none of the admin sections above, so they get the row on its own. -->
		<DefaultEditorSetting v-if="!isAdmin && !store.isLoading && !neverConfigured" />

		<ConnectionDialog
			v-if="showCredentialsRows && !isModelReadOnly"
			kind="model"
			:open="activeDialog === 'model'"
			:setup="setupChain"
			@update:open="setDialogOpen('model', $event)"
			@saved="handleDialogSaved"
		/>
		<ConnectionDialog
			v-if="showSandboxRow && !isSandboxEnvManaged"
			kind="sandbox"
			:open="activeDialog === 'sandbox'"
			:setup="showCredentialsRows && setupChain"
			@update:open="setDialogOpen('sandbox', $event)"
			@saved="handleDialogSaved"
		/>
		<ConnectionDialog
			v-if="showCredentialsRows && !isSearchEnvManaged"
			kind="search"
			:open="activeDialog === 'search'"
			:setup="setupChain"
			@update:open="setDialogOpen('search', $event)"
			@saved="handleDialogSaved"
		/>
	</PongSettingsLayout>
</template>

<style lang="scss" module>
.titleWithTag {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.dim {
	opacity: 0.5;
	pointer-events: none;
}

/* Keeps "lead-in + link + icon" on one line, as the page header does. */
.docsPhrase {
	white-space: nowrap;
}

.permissionList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
}

.permissionDescription {
	padding-bottom: var(--spacing--2xs);
}

.permissionRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.permissionSelect {
	width: 11rem;
}
</style>
