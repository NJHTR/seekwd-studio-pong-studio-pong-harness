<script lang="ts" setup>
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useSSOStore, SupportedProtocols, type SupportedProtocolType } from '../sso.store';
import { useI18n } from '@pong/i18n';
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { onBeforeRouteLeave, type NavigationGuardNext } from 'vue-router';
import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongEmptyState,
	PongCallout,
	PongOption,
	PongSelect,
	PongSettingsPageHeader,
	PongText,
} from '@pong/design-system';
import AuthenticationBackLink from '../components/AuthenticationBackLink.vue';
import SamlSettingsForm from '../components/SamlSettingsForm.vue';
import OidcSettingsForm from '../components/OidcSettingsForm.vue';
import { useUserRoleProvisioningStore } from '../provisioning/composables/userRoleProvisioning.store';

const i18n = useI18n();
const ssoStore = useSSOStore();
const provisioningStore = useUserRoleProvisioningStore();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const isRulesMappingInPong = computed(
	() => provisioningStore.provisioningConfig?.scopesUseExpressionMapping ?? false,
);

const samlFormRef = useTemplateRef<InstanceType<typeof SamlSettingsForm>>('samlForm');
const oidcFormRef = useTemplateRef<InstanceType<typeof OidcSettingsForm>>('oidcForm');

const showUnsavedChangesDialog = ref(false);
const pendingNext = ref<NavigationGuardNext | null>(null);

const options = computed(() => {
	return [
		{
			label: SupportedProtocols.SAML.toUpperCase(),
			value: SupportedProtocols.SAML,
		},
		{
			label: ssoStore.isEnterpriseOidcEnabled
				? SupportedProtocols.OIDC.toUpperCase()
				: `${SupportedProtocols.OIDC.toUpperCase()} (${i18n.baseText('generic.upgradeToEnterprise')})`,
			value: SupportedProtocols.OIDC,
		},
	];
});

const hasAnySsoEnabled = computed(
	() => ssoStore.isEnterpriseSamlEnabled || ssoStore.isEnterpriseOidcEnabled,
);

const activeForm = computed(() => {
	if (authProtocol.value === SupportedProtocols.SAML) return samlFormRef.value;
	if (authProtocol.value === SupportedProtocols.OIDC) return oidcFormRef.value;
	return null;
});

const authProtocol = ref<SupportedProtocolType>(SupportedProtocols.SAML);

function onAuthProtocolUpdated(value: SupportedProtocolType) {
	authProtocol.value = value;
}

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('sso', 'upgrade-sso');
};

onBeforeRouteLeave((_to, _from, next) => {
	if (!activeForm.value?.hasUnsavedChanges) {
		next();
		return;
	}

	pendingNext.value = next;
	showUnsavedChangesDialog.value = true;
});

async function onSaveAndLeave() {
	const next = pendingNext.value;
	pendingNext.value = null;
	showUnsavedChangesDialog.value = false;
	const saved = await activeForm.value?.onSave();
	if (saved) {
		next?.();
	} else {
		next?.(false);
	}
}

function onLeaveWithoutSaving() {
	const next = pendingNext.value;
	pendingNext.value = null;
	showUnsavedChangesDialog.value = false;
	next?.();
}

function onDismissUnsavedChanges() {
	showUnsavedChangesDialog.value = false;
	pendingNext.value?.(false);
	pendingNext.value = null;
}

function onUnsavedDialogOpenUpdate(open: boolean) {
	if (!open) onDismissUnsavedChanges();
}

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.sso.title'));
	ssoStore.initializeSelectedProtocol();
	authProtocol.value = ssoStore.selectedAuthProtocol || SupportedProtocols.SAML;
});
</script>

<template>
	<div class="pb-2xl">
		<AuthenticationBackLink />
		<PongSettingsPageHeader
			:title="i18n.baseText('settings.sso.title')"
			:description="i18n.baseText('settings.sso.info')"
			docs-url="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness"
			:class="$style.header"
			data-test-id="sso-settings-header"
		/>
		<PongCallout v-if="ssoStore.ssoManagedByEnv" theme="warning" class="mb-m">
			{{
				isRulesMappingInPong
					? i18n.baseText('settings.sso.settings.envConfigBannerWithRules')
					: i18n.baseText('settings.sso.settings.envConfigBanner')
			}}
		</PongCallout>
		<!-- Protocol selector — rendered independently outside form v-ifs for E2E timing -->
		<div v-if="hasAnySsoEnabled" :class="[shared.card, $style.protocolCard]">
			<div data-test-id="sso-auth-protocol-select" :class="shared.settingsItem">
				<div :class="shared.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.settings.authProtocol.label') }}</label>
					<small>{{ i18n.baseText('settings.sso.settings.authProtocol.description') }}</small>
				</div>
				<div :class="shared.settingsItemControl">
					<PongSelect
						filterable
						size="medium"
						:disabled="ssoStore.ssoManagedByEnv"
						:model-value="authProtocol"
						:placeholder="i18n.baseText('parameterInput.select')"
						@update:model-value="onAuthProtocolUpdated"
						@keydown.stop
					>
						<PongOption
							v-for="{ label, value } in options"
							:key="value"
							:value="value"
							:label="label"
							data-test-id="credential-select-option"
						/>
					</PongSelect>
				</div>
			</div>
		</div>
		<div
			v-if="ssoStore.isEnterpriseSamlEnabled && authProtocol === SupportedProtocols.SAML"
			data-test-id="sso-content-licensed"
		>
			<SamlSettingsForm ref="samlForm" />
		</div>
		<div
			v-if="ssoStore.isEnterpriseOidcEnabled && authProtocol === SupportedProtocols.OIDC"
			data-test-id="sso-content-licensed"
		>
			<OidcSettingsForm ref="oidcForm" />
		</div>
		<PongEmptyState
			v-if="!hasAnySsoEnabled"
			data-test-id="sso-content-unlicensed"
			:class="$style.actionBox"
			:description="i18n.baseText('settings.sso.actionBox.description')"
			:button-text="i18n.baseText('settings.sso.actionBox.buttonText')"
			@click:button="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.sso.actionBox.title') }}</span>
			</template>
		</PongEmptyState>

		<PongDialog
			:open="showUnsavedChangesDialog"
			size="medium"
			:header="i18n.baseText('settings.sso.settings.unsavedChanges.title')"
			data-test-id="sso-unsaved-changes-dialog"
			@update:open="onUnsavedDialogOpenUpdate"
		>
			<PongDialogBody>
				<PongText>{{ i18n.baseText('settings.sso.settings.unsavedChanges.message') }}</PongText>
			</PongDialogBody>
			<PongDialogFooter>
				<PongButton variant="outline" data-test-id="sso-unsaved-leave" @click="onLeaveWithoutSaving">
					{{ i18n.baseText('settings.sso.settings.unsavedChanges.leaveWithoutSaving') }}
				</PongButton>
				<PongButton
					variant="solid"
					data-test-id="sso-unsaved-save-and-leave"
					@click="onSaveAndLeave"
				>
					{{ i18n.baseText('settings.sso.settings.unsavedChanges.saveAndLeave') }}
				</PongButton>
			</PongDialogFooter>
		</PongDialog>
	</div>
</template>

<style lang="scss" module="shared" src="../styles/sso-form.module.scss" />

<style lang="scss" module>
/* This page is not inside PongSettingsLayout (which owns the header → content gap), so it keeps its own. */
.header {
	margin-bottom: var(--spacing--lg);
}

.protocolCard {
	margin-bottom: 0;
	padding-bottom: 0;
	border-bottom: none;
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
}

.actionBox {
	margin-top: var(--spacing--lg);
}
</style>
