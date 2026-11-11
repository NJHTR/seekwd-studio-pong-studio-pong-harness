<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { I18nT } from 'vue-i18n';
import type {
	PublicApiRateLimitSettings,
	PublicApiRateLimitSettingsResponse,
} from '@pong/api-types';
import {
	PongButton,
	PongIcon,
	PongSettingsRow,
	PongSettingsRowGroup,
	PongSettingsSection,
	PongSwitch,
	PongText,
	PongTooltip,
} from '@pong/design-system';
import { PUBLIC_API_RATE_LIMITS_DOCS_URL, VIEWS } from '@/app/constants';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import * as rateLimitSettingsApi from '@pong/rest-api-client/api/public-api-rate-limit-settings';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useRootStore } from '@pong/stores/useRootStore';

import ApiKeyRateLimitsDialog from './ApiKeyRateLimitsDialog.vue';
import { RATE_LIMIT_GROUP_KEYS, summarizeLimits } from './rateLimits';

const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const { showToast, showError } = useToast();

const isSaving = ref(false);
const dialogOpen = ref(false);
const dialogMode = ref<'enable' | 'edit'>('enable');

const { state } = useAsyncState(async () => {
	try {
		return await rateLimitSettingsApi.getPublicApiRateLimitSettings(rootStore.restApiContext);
	} catch (error) {
		showError(error, i18n.baseText('settings.security.rateLimits.error.load'));
		return undefined;
	}
}, undefined);

const settings = computed((): PublicApiRateLimitSettings | undefined => {
	if (!state.value) return undefined;
	const { defaults: _defaults, envManagedFields: _envManagedFields, ...values } = state.value;
	return values;
});

const areApiKeysDisabled = computed(() => !settingsStore.isPublicApiEnabled);
const isEnabledEnvManaged = computed(
	() => state.value?.envManagedFields.includes('enabled') ?? false,
);
const isToggleLocked = computed(() => areApiKeysDisabled.value || isEnabledEnvManaged.value);
const toggleLockedReason = computed(() =>
	areApiKeysDisabled.value
		? i18n.baseText('settings.security.rateLimits.apiKeysDisabled')
		: i18n.baseText('settings.security.rateLimits.envLocked.toggle'),
);

const toggleValue = computed({
	get: () => settings.value?.enabled ?? false,
	set: (value: boolean) => {
		if (!settings.value) return;
		if (value) {
			openDialog('enable');
			return;
		}
		void save({ ...settings.value, enabled: false });
	},
});

function openDialog(mode: 'enable' | 'edit') {
	dialogMode.value = mode;
	dialogOpen.value = true;
}

function successMessage(before: boolean, after: boolean) {
	if (before === after) return i18n.baseText('settings.security.rateLimits.success.saved');
	return after
		? i18n.baseText('settings.security.rateLimits.success.enabled')
		: i18n.baseText('settings.security.rateLimits.success.disabled');
}

async function save(next: PublicApiRateLimitSettings) {
	const wasEnabled = settings.value?.enabled ?? false;
	isSaving.value = true;
	try {
		const response: PublicApiRateLimitSettingsResponse =
			await rateLimitSettingsApi.updatePublicApiRateLimitSettings(rootStore.restApiContext, next);
		state.value = response;
		dialogOpen.value = false;
		showToast({
			type: 'success',
			title: successMessage(wasEnabled, response.enabled),
			message: '',
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.security.rateLimits.error.save'));
	} finally {
		isSaving.value = false;
	}
}
</script>

<template>
	<PongSettingsSection
		v-if="state && settings"
		:title="i18n.baseText('settings.security.rateLimits.title')"
		data-test-id="rate-limits-section"
	>
		<PongSettingsRowGroup>
			<PongSettingsRow :model-value="settings.enabled" expandable :disclosure="false">
				<template #info>
					<PongText :bold="true">
						{{ i18n.baseText('settings.security.rateLimits.enable.title') }}
					</PongText>
					<PongText size="small" color="text-light" data-test-id="rate-limits-description">
						<I18nT
							keypath="settings.security.rateLimits.enable.description"
							tag="span"
							scope="global"
						>
							<template #apiKeys>
								<RouterLink
									:to="{ name: VIEWS.API_SETTINGS }"
									data-test-id="rate-limits-api-keys-link"
								>
									{{ i18n.baseText('settings.security.rateLimits.enable.description.apiKeys') }}
								</RouterLink>
							</template>
							<template #rateLimits>
								<a
									:href="PUBLIC_API_RATE_LIMITS_DOCS_URL"
									target="_blank"
									rel="noopener noreferrer"
									:class="$style.docsLink"
								>
									{{ i18n.baseText('settings.security.rateLimits.enable.description.rateLimits') }}
									<PongIcon icon="arrow-up-right" size="xsmall" />
								</a>
							</template>
						</I18nT>
					</PongText>
				</template>
				<template #action>
					<PongTooltip :disabled="!isToggleLocked" :content="toggleLockedReason">
						<PongSwitch
							v-model="toggleValue"
							size="large"
							:aria-label="i18n.baseText('settings.security.rateLimits.enable.title')"
							:disabled="isToggleLocked || isSaving"
							data-test-id="rate-limits-toggle"
						/>
					</PongTooltip>
				</template>
				<template #expanded>
					<div v-if="settings.enabled" :class="$style.summary">
						<div :class="$style.summaryLines">
							<div v-for="group in RATE_LIMIT_GROUP_KEYS" :key="group" :class="$style.summaryLine">
								<div :class="$style.summaryLabel">
									<PongText size="small">
										{{ i18n.baseText(`settings.security.rateLimits.group.${group}`) }}
									</PongText>
									<PongTooltip
										:content="i18n.baseText(`settings.security.rateLimits.group.${group}.tooltip`)"
									>
										<PongIcon icon="info" size="small" color="text-light" />
									</PongTooltip>
								</div>
								<PongText
									size="small"
									:class="$style.summaryValue"
									:data-test-id="`rate-limits-summary-${group}`"
								>
									{{ summarizeLimits(settings, group, i18n) }}
								</PongText>
							</div>
						</div>
						<PongTooltip :content="i18n.baseText('settings.security.rateLimits.edit')">
							<PongButton
								variant="ghost"
								size="small"
								icon-only
								:aria-label="i18n.baseText('settings.security.rateLimits.edit')"
								:disabled="areApiKeysDisabled"
								data-test-id="rate-limits-edit"
								@click="openDialog('edit')"
							>
								<PongIcon icon="pencil" />
							</PongButton>
						</PongTooltip>
					</div>
				</template>
			</PongSettingsRow>
		</PongSettingsRowGroup>

		<ApiKeyRateLimitsDialog
			v-model:open="dialogOpen"
			:mode="dialogMode"
			:settings="settings"
			:defaults="state.defaults"
			:env-managed-fields="state.envManagedFields"
			:saving="isSaving"
			@save="save"
		/>
	</PongSettingsSection>
</template>

<style lang="scss" module>
.docsLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.summary {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
}

.summaryLines {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
}

.summaryLine {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.summaryLabel {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.summaryValue {
	min-width: 0;
	overflow-wrap: anywhere;
	text-align: right;
}
</style>
