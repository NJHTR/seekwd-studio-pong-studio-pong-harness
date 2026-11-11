<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ElSwitch } from 'element-plus';
import { I18nT } from 'vue-i18n';
import {
	PongAlertDialog,
	PongBadge,
	PongLink,
	PongSelect2,
	PongSettingsRow,
	PongSettingsRowGroup,
	PongSettingsSection,
	PongText,
	PongTooltip,
} from '@pong/design-system';
import type { SelectOptionBase, SelectValue } from '@pong/design-system';
import { useI18n, type BaseTextKey } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import type { RedactionFloor } from '@pong/api-types';
import * as securitySettingsApi from '@pong/rest-api-client/api/security-settings';
import { useToast } from '@pong/composables/useToast';
import {
	EnterpriseEditionFeature,
	EXECUTION_DATA_REDACTION_ENFORCEMENT_DOCS_URL,
} from '@/app/constants';
import EnterpriseEdition from '@/app/components/EnterpriseEdition.ee.vue';
import { useSettingsStore } from '@pong/stores/settings.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';

type EnforcedFloor = Exclude<RedactionFloor, 'off'>;

// Map the new floor enum to the existing i18n key suffixes so we don't
// churn translations. 'production' uses the legacy 'non-manual' suffix.
const FLOOR_TO_LEGACY_KEY: Record<EnforcedFloor, 'non-manual' | 'all'> = {
	production: 'non-manual',
	all: 'all',
};

const TOOLTIP_KEY = 'settings.security.dataRedaction.unlicensed_tooltip';

const props = defineProps<{
	initialFloor: RedactionFloor;
	managedByEnv: boolean;
}>();

const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const { showToast, showError } = useToast();
const pageRedirectionHelper = usePageRedirectionHelper();

const floor = ref<RedactionFloor>(props.initialFloor);
const showEnableDialog = ref(false);
const showDisableDialog = ref(false);
const isSaving = ref(false);

const isLicensed = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction],
);

const enforced = computed({
	get: () => floor.value !== 'off',
	set: (value: boolean) => {
		if (value) {
			showEnableDialog.value = true;
			return;
		}
		showDisableDialog.value = true;
	},
});

const dropdownFloor = computed<EnforcedFloor>(() =>
	floor.value === 'off' ? 'production' : floor.value,
);

const floorOptions = computed<Array<SelectOptionBase<EnforcedFloor>>>(() =>
	(['production', 'all'] as EnforcedFloor[]).map((value) => ({
		value,
		label: i18n.baseText(
			`settings.security.dataRedaction.scope.option.${FLOOR_TO_LEGACY_KEY[value]}` as BaseTextKey,
		),
	})),
);

const affectedScopeText = computed(() => {
	if (floor.value === 'off') {
		return i18n.baseText('settings.security.dataRedaction.affectedScope.none');
	}
	return i18n.baseText(
		`settings.security.dataRedaction.affectedScope.${FLOOR_TO_LEGACY_KEY[floor.value]}` as BaseTextKey,
	);
});

async function persist(
	nextFloor: RedactionFloor,
	successKey: BaseTextKey,
	errorKey: BaseTextKey,
): Promise<boolean> {
	const previousFloor = floor.value;
	floor.value = nextFloor;
	isSaving.value = true;
	try {
		await securitySettingsApi.updateSecuritySettings(rootStore.restApiContext, {
			redactionEnforcement: { floor: nextFloor },
		});
		showToast({
			type: 'success',
			title: i18n.baseText(successKey),
			message: '',
		});
		return true;
	} catch (error) {
		floor.value = previousFloor;
		showError(error, i18n.baseText(errorKey));
		return false;
	} finally {
		isSaving.value = false;
	}
}

async function confirmEnable() {
	const ok = await persist(
		'production',
		'settings.security.dataRedaction.enforce.success.enabled',
		'settings.security.dataRedaction.enforce.error',
	);
	if (ok) showEnableDialog.value = false;
}

async function confirmDisable() {
	const ok = await persist(
		'off',
		'settings.security.dataRedaction.enforce.success.disabled',
		'settings.security.dataRedaction.enforce.error',
	);
	if (ok) showDisableDialog.value = false;
}

function onSelectFloor(value: SelectValue | undefined) {
	if (!value) return;
	const next = value as EnforcedFloor;
	if (next === dropdownFloor.value) return;
	void persist(
		next,
		'settings.security.dataRedaction.scope.success',
		'settings.security.dataRedaction.scope.error',
	);
}

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('data-redaction', 'upgrade-data-redaction');
}
</script>

<template>
	<PongSettingsSection
		:title="i18n.baseText('settings.security.dataRedaction.title')"
		data-test-id="security-data-redaction-section"
	>
		<PongSettingsRowGroup>
			<PongSettingsRow>
				<template #info>
					<PongText :bold="true">
						{{ i18n.baseText('settings.security.dataRedaction.enforce.title') }}
						<PongBadge v-if="!isLicensed" class="ml-4xs">
							{{ i18n.baseText('generic.upgrade') }}
						</PongBadge>
					</PongText>
					<PongText size="small" color="text-light">
						{{ i18n.baseText('settings.security.dataRedaction.enforce.message') }}
						<PongLink
							:to="EXECUTION_DATA_REDACTION_ENFORCEMENT_DOCS_URL"
							size="small"
							new-window
							data-test-id="redaction-enforcement-docs-link"
						>
							{{ i18n.baseText('generic.learnMore') }}
						</PongLink>
					</PongText>
				</template>
				<template #action>
					<EnterpriseEdition :features="[EnterpriseEditionFeature.DataRedaction]">
						<ElSwitch
							v-model="enforced"
							size="large"
							:disabled="props.managedByEnv || isSaving"
							data-test-id="enable-redaction-enforcement"
						/>
						<template #fallback>
							<PongTooltip>
								<ElSwitch
									:model-value="enforced"
									size="large"
									:disabled="true"
									data-test-id="enable-redaction-enforcement"
								/>
								<template #content>
									<I18nT :keypath="TOOLTIP_KEY" tag="span" scope="global">
										<template #action>
											<a @click="goToUpgrade">
												{{
													i18n.baseText('settings.security.dataRedaction.unlicensed_tooltip.link')
												}}
											</a>
										</template>
									</I18nT>
								</template>
							</PongTooltip>
						</template>
					</EnterpriseEdition>
				</template>
			</PongSettingsRow>

			<PongSettingsRow v-if="!isLicensed || enforced" data-test-id="redaction-enforcement-scope-row">
				<template #info>
					<PongText :bold="true">
						{{ i18n.baseText('settings.security.dataRedaction.scope.title') }}
						<PongBadge v-if="!isLicensed" class="ml-4xs">
							{{ i18n.baseText('generic.upgrade') }}
						</PongBadge>
					</PongText>
				</template>
				<template #action>
					<EnterpriseEdition :features="[EnterpriseEditionFeature.DataRedaction]">
						<PongSelect2
							:model-value="dropdownFloor"
							:items="floorOptions"
							size="medium"
							:disabled="props.managedByEnv || isSaving"
							data-test-id="redaction-enforcement-scope-select"
							@update:model-value="onSelectFloor"
						/>
						<template #fallback>
							<PongTooltip>
								<PongSelect2
									:model-value="dropdownFloor"
									:items="floorOptions"
									size="medium"
									:disabled="true"
									data-test-id="redaction-enforcement-scope-select"
								/>
								<template #content>
									<I18nT :keypath="TOOLTIP_KEY" tag="span" scope="global">
										<template #action>
											<a @click="goToUpgrade">
												{{
													i18n.baseText('settings.security.dataRedaction.unlicensed_tooltip.link')
												}}
											</a>
										</template>
									</I18nT>
								</template>
							</PongTooltip>
						</template>
					</EnterpriseEdition>
				</template>
			</PongSettingsRow>

			<PongSettingsRow
				:title="i18n.baseText('settings.security.dataRedaction.affectedScope.label')"
				data-test-id="redaction-enforcement-summary"
			>
				<template #action>
					<PongText size="small" color="text-light">
						{{ affectedScopeText }}
					</PongText>
				</template>
			</PongSettingsRow>
		</PongSettingsRowGroup>

		<PongAlertDialog
			:open="showEnableDialog"
			:title="i18n.baseText('settings.security.dataRedaction.enforce.confirmEnable.headline')"
			:description="i18n.baseText('settings.security.dataRedaction.enforce.confirmEnable.message')"
			:action-label="i18n.baseText('settings.security.dataRedaction.enforce.confirmEnable.action')"
			:loading="isSaving"
			size="medium"
			data-test-id="redaction-enforcement-enable-confirm"
			@action="confirmEnable"
			@cancel="showEnableDialog = false"
			@update:open="showEnableDialog = $event"
		/>

		<PongAlertDialog
			:open="showDisableDialog"
			:title="i18n.baseText('settings.security.dataRedaction.enforce.confirmDisable.headline')"
			:description="i18n.baseText('settings.security.dataRedaction.enforce.confirmDisable.message')"
			:action-label="i18n.baseText('settings.security.dataRedaction.enforce.confirmDisable.action')"
			:loading="isSaving"
			size="medium"
			data-test-id="redaction-enforcement-disable-confirm"
			@action="confirmDisable"
			@cancel="showDisableDialog = false"
			@update:open="showDisableDialog = $event"
		/>
	</PongSettingsSection>
</template>
