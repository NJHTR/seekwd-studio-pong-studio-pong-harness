<script setup lang="ts">
import {
	isPromotionGitHostType,
	promotionDirectionSchema,
	type PromotionDirection,
} from '@pong/api-types';
import { useDocumentTitle } from '@pong/composables/useDocumentTitle';
import { useToast } from '@pong/composables/useToast';
import {
	PongButton,
	PongEmptyState,
	PongEnterpriseReadinessBadge,
	PongExternalLink,
	PongLoading2,
	PongPreviewBadge,
	PongSettingsLayout,
	PongSettingsPageHeader,
	PongSettingsRow,
	PongSettingsRowGroup,
	PongSettingsSection,
	PongSwitch,
	PongText,
	useMessage,
} from '@pong/design-system';
import { capabilities, capabilityRegistry } from '@pong/frontend-module-sdk';
import { useI18n } from '@pong/i18n';
import { ResponseError } from '@pong/rest-api-client';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useRootStore } from '@pong/stores/useRootStore';
import { nextTick, onMounted, reactive, ref, type ComponentPublicInstance } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useLatestFetch } from '@pong/composables/useLatestFetch';
import PromotionEnvironmentCard from '../components/PromotionEnvironmentCard.vue';
import { invalidateInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import { useInstanceProtection } from '../composables/useInstanceProtection';
import { usePromotionCheckout } from '../composables/usePromotionCheckout';
import {
	ENVIRONMENTS_DOCS_URL,
	ENVIRONMENTS_PLAN_DOCS_URL,
	PROMOTIONS_ENVIRONMENT_ADD_VIEW,
	PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
} from '../promotions.constants';
import {
	deletePromotionEnvironment,
	deleteProviderIfUnused,
	fetchPromotionEnvironment,
	fetchPromotionEnvironments,
	type PromotionEnvironment,
} from '../promotionsSettings.api';

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const router = useRouter();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const documentTitle = useDocumentTitle({ releaseChannel: settingsStore.settings.releaseChannel });
const { next: nextLoad } = useLatestFetch();
const { connectErrors, canConnect, connect } = usePromotionCheckout();
const {
	busy: switchBusy,
	canSwitchBack,
	switchTo: switchEnvironmentsVersion,
} = capabilityRegistry.use(capabilities.environmentsSettings).useVersionSwitch();
const {
	busy: protectionBusy,
	isProtected,
	load: loadProtection,
	set: setProtected,
} = useInstanceProtection();

const environments = ref<Partial<Record<PromotionDirection, PromotionEnvironment>>>({});
const isInitialLoading = ref(true);
const loadError = ref(false);
const busy = reactive(new Map<string, 'retry' | 'remove'>());
const addButtons: Partial<Record<PromotionDirection, Element | ComponentPublicInstance | null>> =
	{};

async function load() {
	const isLatestLoad = nextLoad();
	loadError.value = false;
	try {
		const context = rootStore.publicApiContext;
		const summaries = await fetchPromotionEnvironments(context, { scope: 'instance' });
		const details = await Promise.all(
			summaries.map(async ({ id }) => await fetchPromotionEnvironment(context, id)),
		);
		if (!isLatestLoad()) return;
		environments.value = Object.fromEntries(details.map((detail) => [detail.direction, detail]));
	} catch (error) {
		if (!isLatestLoad()) return;
		loadError.value = true;
		toast.showError(error, i18n.baseText('settings.promotions.environments.error.title'));
	} finally {
		if (isLatestLoad()) isInitialLoading.value = false;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.promotions.title'));
	await Promise.all([load(), loadProtection()]);
});

async function retry(environment: PromotionEnvironment) {
	busy.set(environment.id, 'retry');
	if (await connect(environment.id)) await load();
	busy.delete(environment.id);
}

async function remove(environment: PromotionEnvironment) {
	// Only a Promote environment on a Git host has promotion reviews to close.
	const hasReviews =
		environment.direction === 'promote' && isPromotionGitHostType(environment.provider.type);
	const messageKey = hasReviews
		? 'settings.promotions.environment.remove.confirm.message.gitHost'
		: 'settings.promotions.environment.remove.confirm.message';
	const confirmed = await message.confirm(
		i18n.baseText(messageKey, { interpolate: { name: environment.name } }),
		i18n.baseText('settings.promotions.environment.remove.confirm.title'),
		{
			confirmButtonText: i18n.baseText('settings.promotions.environment.remove.confirm.button'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			customClass: 'el-message-box--destructive',
			showClose: true,
		},
	);
	if (confirmed !== 'confirm') return;

	const context = rootStore.publicApiContext;
	busy.set(environment.id, 'remove');
	try {
		await deletePromotionEnvironment(context, environment.id);
	} catch (error) {
		if (!(error instanceof ResponseError && error.httpStatusCode === 404)) {
			busy.delete(environment.id);
			toast.showError(error, i18n.baseText('settings.promotions.environment.toast.error.remove'));
			return;
		}
	}
	try {
		await deleteProviderIfUnused(context, environment.provider.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.provider.toast.error.delete'));
	}
	connectErrors.delete(environment.id);
	invalidateInstancePromotionConnection();
	await load();
	busy.delete(environment.id);
	toast.showMessage({
		title: i18n.baseText('settings.promotions.environment.toast.removed', {
			interpolate: { name: environment.name },
		}),
		type: 'success',
	});
	await nextTick();
	const addButton = addButtons[environment.direction];
	if (addButton && '$el' in addButton && addButton.$el instanceof HTMLElement)
		addButton.$el.focus();
}
</script>

<template>
	<PongSettingsLayout :class="$style.layout">
		<PongSettingsPageHeader
			:title="i18n.baseText('settings.promotions.title')"
			:description="i18n.baseText('settings.promotions.description')"
			:docs-url="ENVIRONMENTS_PLAN_DOCS_URL"
		>
			<template #titleTrailing>
				<PongPreviewBadge size="xsmall" data-test-id="promotions-preview-badge" />
				<PongEnterpriseReadinessBadge
					v-if="settingsStore.isEnterprisePlan"
					size="xsmall"
					data-test-id="promotions-enterprise-readiness-badge"
				/>
			</template>
		</PongSettingsPageHeader>

		<PongSettingsSection :title="i18n.baseText('settings.promotions.environments.title')">
			<template #description>
				<PongText size="small" color="text-base">
					<I18nT keypath="settings.promotions.environments.description" tag="span" scope="global">
						<template #environments>
							<PongExternalLink inline size="small" :href="ENVIRONMENTS_DOCS_URL">{{
								i18n.baseText('settings.promotions.environments.description.link')
							}}</PongExternalLink>
						</template>
					</I18nT>
				</PongText>
			</template>
			<PongLoading2 v-if="isInitialLoading" :rows="2" :shrink-last="false" />
			<PongEmptyState
				v-else-if="loadError"
				:heading="i18n.baseText('settings.promotions.environments.error.title')"
				:description="i18n.baseText('settings.promotions.environments.error.description')"
				:button-text="i18n.baseText('generic.retry')"
				data-test-id="promotion-environments-load-error"
				@click:button="load"
			/>
			<PongSettingsRowGroup v-else>
				<div :class="$style.columns">
					<template v-for="direction in promotionDirectionSchema.options" :key="direction">
						<PromotionEnvironmentCard
							v-if="environments[direction]"
							:key="environments[direction].id"
							:class="$style.column"
							:environment="environments[direction]"
							:busy="busy.get(environments[direction].id)"
							:connect-error="connectErrors.get(environments[direction].id)"
							:can-connect="canConnect"
							:data-test-id="`promotion-environment-card-${direction}`"
							@retry="retry(environments[direction])"
							@edit="
								router.push({
									name: PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
									params: { environmentId: environments[direction].id },
								})
							"
							@remove="remove(environments[direction])"
						/>
						<div v-else :class="$style.column">
							<PongSettingsRow
								:title="i18n.baseText(`settings.promotions.environments.${direction}.title`)"
								:show-divider="false"
							/>
							<div :class="$style.empty">
								<PongButton
									:ref="(button) => (addButtons[direction] = button)"
									variant="outline"
									icon="plus"
									:data-test-id="`promotion-environment-add-${direction}`"
									@click="
										router.push({ name: PROMOTIONS_ENVIRONMENT_ADD_VIEW, params: { direction } })
									"
								>
									{{ i18n.baseText('settings.promotions.environments.add') }}
								</PongButton>
							</div>
						</div>
					</template>
				</div>
			</PongSettingsRowGroup>
			<PongSettingsRowGroup>
				<PongSettingsRow
					:title="i18n.baseText('settings.sourceControl.protected.bold')"
					:description="i18n.baseText('settings.promotions.protected.description')"
				>
					<template #action>
						<PongSwitch
							:model-value="isProtected"
							:disabled="protectionBusy"
							:aria-label="i18n.baseText('settings.sourceControl.protected.bold')"
							data-test-id="promotion-protected-instance-switch"
							@update:model-value="setProtected"
						/>
					</template>
				</PongSettingsRow>
			</PongSettingsRowGroup>
		</PongSettingsSection>
		<PongText
			v-if="canSwitchBack"
			tag="p"
			size="small"
			color="text-light"
			class="mt-2xl"
			data-test-id="promotions-switch-back"
		>
			<I18nT keypath="settings.promotions.switchBack.text" tag="span" scope="global">
				<template #action>
					<button
						type="button"
						:class="$style.switchBack"
						:disabled="switchBusy"
						data-test-id="promotions-switch-to-v1"
						@click="switchEnvironmentsVersion('v1')"
					>
						{{ i18n.baseText('settings.promotions.switchBack.button') }}
					</button>
				</template>
			</I18nT>
		</PongText>
	</PongSettingsLayout>
</template>

<style lang="scss" module>
.layout {
	container-type: inline-size;
	padding-top: 0;
}

.columns {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));

	// The editor's $breakpoint-2xs. The module cannot import the editor styles.
	@container (max-width: 600px) {
		grid-template-columns: minmax(0, 1fr);
	}
}

.column {
	display: flex;
	flex-direction: column;

	& + & {
		border-inline-start: var(--border-width, 1px) solid var(--border-color--subtle);

		// The editor's $breakpoint-2xs. The module cannot import the editor styles.
		@container (max-width: 600px) {
			border-inline-start: none;
			border-block-start: var(--border-width, 1px) solid var(--border-color--subtle);
		}
	}
}

.switchBack {
	padding: 0;
	border: 0;
	background: none;
	font: inherit;
	color: inherit;
	text-decoration: underline;
	cursor: pointer;
}

.empty {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg) var(--spacing--sm);
}
</style>
