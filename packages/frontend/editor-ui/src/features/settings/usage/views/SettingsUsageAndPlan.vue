<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { UsageTelemetry } from '../usage.store';
import { useUsageStore } from '../usage.store';
import { telemetry } from '@/app/plugins/telemetry';
import { i18n as locale } from '@pong/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@pong/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '../usage.constants';
import { useUsersStore } from '@pong/stores/users.store';
import { getResourcePermissions } from '@pong/permissions';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { I18nT } from 'vue-i18n';

import {
	PongBadge,
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogDescription,
	PongDialogFooter,
	PongHeading,
	PongInfoTip,
	PongInput,
	PongNotice,
	PongText,
	PongTooltip,
} from '@pong/design-system';
import EulaAcceptanceModal from '../components/EulaAcceptanceModal.vue';

const usageStore = useUsageStore();
const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const toast = useToast();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const queryParamCallback = ref<string>(
	`callback=${encodeURIComponent(`${window.location.origin}${window.location.pathname}`)}`,
);
const viewPlansUrl = computed(
	() => `${usageStore.viewPlansUrl}&${queryParamCallback.value}&source=usage_page`,
);
const managePlanUrl = computed(() => `${usageStore.managePlanUrl}&${queryParamCallback.value}`);
const activationKeyModal = ref(false);
const activationSuccessModal = ref(false);
const activationKey = ref('');
const eulaModal = ref(false);
const eulaUrl = ref('');
// True while the EULA flow runs for a key that came from the URL, so we know we
// must remove that key from the URL when the flow ends.
const activationFromUrl = ref(false);

const canUserActivateLicense = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'license:manage' } }),
);

const badgedPlanName = computed(() => {
	const [badge, name] = usageStore.planName.split(' ');
	return {
		name,
		badge,
	};
});

const isCommunity = computed(() => usageStore.planName.toLowerCase() === 'community');

const isCommunityEditionRegistered = computed(
	() => usageStore.planName.toLowerCase() === 'registered community',
);

const canUserRegisterCommunityPlus = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).community.register,
);

const showActivationSuccess = () => {
	activationSuccessModal.value = true;
};

const showActivationError = (error: unknown) => {
	toast.showError(error, locale.baseText('settings.usageAndPlan.license.activation.error.title'));
};

interface EulaErrorResponse {
	httpStatusCode: number;
	meta: { eulaUrl: string };
}

const isEulaError = (error: unknown): error is EulaErrorResponse => {
	const e = error as EulaErrorResponse;
	return e.httpStatusCode === 400 && !!e.meta?.eulaUrl;
};

const clearKeyFromUrl = async () => {
	if (!activationFromUrl.value) return;
	activationFromUrl.value = false;
	await router.replace({ query: {} });
};

const onLicenseActivation = async (eulaUri?: string) => {
	try {
		await usageStore.activateLicense(activationKey.value.trim(), eulaUri?.trim());
		activationKeyModal.value = false;
		eulaModal.value = false;
		activationKey.value = '';
		await clearKeyFromUrl();
		showActivationSuccess();
	} catch (error: unknown) {
		// Check if error requires EULA acceptance using type guard
		if (isEulaError(error)) {
			eulaUrl.value = error.meta.eulaUrl;
			eulaModal.value = true;
			activationKeyModal.value = false;
			return;
		}

		showActivationError(error);
	}
};

const onEulaAccept = async () => {
	try {
		await onLicenseActivation(eulaUrl.value);
	} catch (error) {
		// Error is already handled in onLicenseActivation
		// This catch ensures modal errors don't break the UI
		eulaModal.value = false;
		showActivationError(error);
	}
};

const onEulaCancel = async () => {
	eulaModal.value = false;
	eulaUrl.value = '';
	activationKey.value = '';
	await clearKeyFromUrl();
};

const onActivationCancel = () => {
	activationKeyModal.value = false;
	activationKey.value = '';
};

const onActivationModalClose = () => {
	// Only clear key if not transitioning to EULA flow
	if (!eulaModal.value) {
		onActivationCancel();
	}
};

onMounted(async () => {
	documentTitle.set(locale.baseText('settings.usageAndPlan.title'));
	usageStore.setLoading(true);
	if (route.query.key) {
		const keyFromUrl = route.query.key as string;
		try {
			await usageStore.activateLicense(keyFromUrl);
			await router.replace({ query: {} });
			showActivationSuccess();
			usageStore.setLoading(false);
			return;
		} catch (error) {
			if (isEulaError(error)) {
				// Keep the key from the URL so the EULA acceptance can send it again.
				activationKey.value = keyFromUrl;
				activationFromUrl.value = true;
				eulaUrl.value = error.meta.eulaUrl;
				eulaModal.value = true;
			} else {
				showActivationError(error);
			}
		}
	}
	try {
		if (!route.query.key && canUserActivateLicense.value) {
			await usageStore.refreshLicenseManagementToken();
		} else {
			await usageStore.getLicenseInfo();
		}
		usageStore.setLoading(false);
	} catch (error) {
		if (!error.name) {
			error.name = locale.baseText('settings.usageAndPlan.error');
		}
		toast.showError(error, error.name, { message: error.message });
	}
});

const sendUsageTelemetry = (action: UsageTelemetry['action']) => {
	const telemetryPayload = usageStore.telemetryPayload;
	telemetryPayload.action = action;
	telemetry.track('User clicked button on usage page', telemetryPayload);
};

const onAddActivationKey = () => {
	activationKeyModal.value = true;
	sendUsageTelemetry('add_activation_key');
};

const onViewPlans = () => {
	void pageRedirectionHelper.goToUpgrade('usage_page', 'open');
	sendUsageTelemetry('view_plans');
};

const onManagePlan = () => {
	sendUsageTelemetry('manage_plan');
};

function onActivationDialogOpenUpdate(open: boolean) {
	if (!open) onActivationModalClose();
}

const openCommunityRegisterModal = () => {
	uiStore.openModalWithData({
		name: COMMUNITY_PLUS_ENROLLMENT_MODAL,
		data: {
			customHeading: undefined,
		},
	});
};
</script>

<template>
	<div class="settings-usage-and-plan">
		<PongHeading tag="h2" size="2xlarge">{{
			locale.baseText('settings.usageAndPlan.title')
		}}</PongHeading>
		<div v-if="!usageStore.isLoading">
			<PongHeading tag="h3" :class="$style.title" size="large">
				<I18nT keypath="settings.usageAndPlan.description" tag="span" scope="global">
					<template #name>{{ badgedPlanName.name ?? usageStore.planName }}</template>
					<template #type>
						<span v-if="usageStore.planId">{{
							locale.baseText('settings.usageAndPlan.plan')
						}}</span>
						<span v-else>{{ locale.baseText('settings.usageAndPlan.edition') }}</span>
					</template>
				</I18nT>
				<span v-if="badgedPlanName.badge && badgedPlanName.name" :class="$style.titleTooltip">
					<!-- `as-child` makes the badge itself the tooltip trigger. Without it the
						 tooltip adds an inline span trigger that becomes the flex item, so the
						 badge sits on the heading baseline instead of the optical center. -->
					<PongTooltip placement="top" as-child>
						<template #content>
							<I18nT
								v-if="isCommunityEditionRegistered"
								keypath="settings.usageAndPlan.license.communityRegistered.tooltip"
								scope="global"
							>
							</I18nT>
						</template>
						<PongBadge>{{ badgedPlanName.badge }}</PongBadge>
					</PongTooltip>
				</span>
			</PongHeading>

			<PongNotice v-if="isCommunity && canUserRegisterCommunityPlus" class="mt-0" theme="warning">
				<I18nT keypath="settings.usageAndPlan.callOut" scope="global">
					<template #link>
						<PongButton
							variant="ghost"
							class="pl-0 pr-0"
							:label="locale.baseText('settings.usageAndPlan.callOut.link')"
							@click="openCommunityRegisterModal"
						/>
					</template>
				</I18nT>
			</PongNotice>

			<div :class="$style.quota">
				<PongText size="medium" color="text-light">
					{{ locale.baseText('settings.usageAndPlan.activeWorkflows') }}
				</PongText>
				<div :class="$style.chart">
					<span v-if="usageStore.activeWorkflowTriggersLimit > 0" :class="$style.chartLine">
						<span
							:class="$style.chartBar"
							:style="{ width: `${usageStore.executionPercentage}%` }"
						></span>
					</span>
					<I18nT
						tag="span"
						:class="$style.count"
						keypath="settings.usageAndPlan.activeWorkflows.count"
						scope="global"
					>
						<template #count>{{ usageStore.activeWorkflowTriggersCount }}</template>
						<template #limit>
							<span v-if="usageStore.activeWorkflowTriggersLimit < 0">{{
								locale.baseText('settings.usageAndPlan.activeWorkflows.unlimited')
							}}</span>
							<span v-else>{{ usageStore.activeWorkflowTriggersLimit }}</span>
						</template>
					</I18nT>
				</div>
			</div>

			<PongInfoTip>{{ locale.baseText('settings.usageAndPlan.activeWorkflows.hint') }}</PongInfoTip>

			<div :class="$style.buttons">
				<PongButton
					variant="outline"
					v-if="canUserActivateLicense"
					:class="$style.buttonTertiary"
					size="large"
					@click="onAddActivationKey"
				>
					<span>{{ locale.baseText('settings.usageAndPlan.button.activation') }}</span>
				</PongButton>
				<PongButton v-if="usageStore.managementToken" size="large" @click="onManagePlan">
					<a :href="managePlanUrl" target="_blank">{{
						locale.baseText('settings.usageAndPlan.button.manage')
					}}</a>
				</PongButton>
				<PongButton v-else size="large" @click.prevent="onViewPlans">
					<a :href="viewPlansUrl" target="_blank">{{
						locale.baseText('settings.usageAndPlan.button.plans')
					}}</a>
				</PongButton>
			</div>

			<PongDialog
				:open="activationKeyModal"
				size="medium"
				:header="locale.baseText('settings.usageAndPlan.dialog.activation.title')"
				@update:open="onActivationDialogOpenUpdate"
			>
				<PongDialogBody>
					<PongInput
						v-model="activationKey"
						:placeholder="locale.baseText('settings.usageAndPlan.dialog.activation.label')"
					/>
				</PongDialogBody>
				<PongDialogFooter>
					<PongButton variant="outline" @click="onActivationCancel">
						{{ locale.baseText('settings.usageAndPlan.dialog.activation.cancel') }}
					</PongButton>
					<PongButton :disabled="!activationKey" @click="() => onLicenseActivation()">
						{{ locale.baseText('settings.usageAndPlan.dialog.activation.activate') }}
					</PongButton>
				</PongDialogFooter>
			</PongDialog>

			<PongDialog
				v-model:open="activationSuccessModal"
				size="small"
				:header="locale.baseText('settings.usageAndPlan.license.activation.success.title')"
			>
				<PongDialogBody>
					<PongDialogDescription
						:class="$style.activationSuccessDescription"
						data-test-id="license-activation-success-dialog"
					>
						{{ locale.baseText('settings.usageAndPlan.license.activation.success.message') }}
					</PongDialogDescription>
				</PongDialogBody>
				<PongDialogFooter>
					<PongButton
						data-test-id="license-activation-success-close-button"
						@click="activationSuccessModal = false"
					>
						{{ locale.baseText('generic.close') }}
					</PongButton>
				</PongDialogFooter>
			</PongDialog>

			<EulaAcceptanceModal
				v-model="eulaModal"
				:eula-url="eulaUrl"
				@accept="onEulaAccept"
				@cancel="onEulaCancel"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

.actionBox {
	margin: var(--spacing--2xl) 0 0;
}

.spacedFlex {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.title {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xl) 0 var(--spacing--md);
}

.quota {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 54px;
	padding: 0 var(--spacing--sm);
	margin: 0 0 var(--spacing--xs);
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: 1px solid var(--color--foreground);
	white-space: nowrap;

	.count {
		text-transform: lowercase;
		font-size: var(--font-size--sm);
	}
}

.buttons {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing--xl) 0 0;

	button {
		margin-left: var(--spacing--xs);

		a {
			display: inline-block;
			color: inherit;
			text-decoration: none;
			padding: var(--spacing--xs) var(--spacing--md);
			margin: calc(var(--spacing--xs) * -1) calc(var(--spacing--md) * -1);
		}
	}
}

.chart {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-grow: 1;
}

.chartLine {
	display: block;
	height: 10px;
	width: 100%;
	max-width: 260px;
	margin: 0 var(--spacing--md);
	border-radius: 10px;
	background: var(--color--background);
}

.chartBar {
	float: left;
	height: 100%;
	max-width: 100%;
	background: var(--color--secondary);
	border-radius: 10px;
	transition: width 0.2s $ease-out-expo;
}

div[class*='info'] > span > span:last-child {
	line-height: 1.4;
	padding: 0 0 0 var(--spacing--4xs);
}

.titleTooltip {
	display: flex;
	align-items: center;
	margin: 0 0 0 var(--spacing--2xs);
}

.activationSuccessDescription {
	display: block;
	margin-top: var(--spacing--xs);
}
</style>
