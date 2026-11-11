<script setup lang="ts">
import { promotionProviderTypeCapabilities, type PromotionProviderType } from '@pong/api-types';
import { useToast } from '@pong/composables/useToast';
import {
	PongButton,
	PongCheckbox,
	PongCopyInput,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongDialogHeader,
	PongDialogTitle,
	PongInput,
	PongInputLabel,
	PongNotice,
	PongOption,
	PongSelect,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef, watch } from 'vue';

import {
	createPromotionProvider,
	fetchPromotionEnvironments,
	fetchPromotionProvider,
	updatePromotionProvider,
	type PromotionEnvironmentSummary,
	type PromotionProvider,
} from '../promotionsSettings.api';
import {
	buildProviderCreatePayload,
	buildProviderUpdatePayload,
	emptyProviderForm,
	isSamePromotionHostUrl,
	providerFormFrom,
	type PromotionProviderChange,
	type ProviderFormState,
} from '../promotionsSettings.utils';

const props = defineProps<{
	open: boolean;
	providerId?: string;
	type?: PromotionProviderType;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	saved: [change: PromotionProviderChange];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const form = reactive<ProviderFormState>(emptyProviderForm(props.type));

const step = ref<'form' | 'key'>('form');
const current = ref<PromotionProvider | null>(null);
const usedBy = ref<PromotionEnvironmentSummary[]>([]);
const generatedPublicKey = ref<string | null>(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const saveError = ref<string>();
const nameInput = useTemplateRef<InstanceType<typeof PongInput>>('nameInput');
const doneButton = useTemplateRef<{ $el?: HTMLElement }>('doneButton');

const isEdit = computed(() => props.providerId !== undefined);
const capabilities = computed(() => promotionProviderTypeCapabilities[form.type]);

watch(
	() => [form.baseUrl, form.password],
	() => {
		saveError.value = undefined;
	},
);

const title = computed(() => {
	if (step.value === 'key') return i18n.baseText('settings.promotions.provider.dialog.title.key');
	if (isEdit.value) return i18n.baseText('settings.promotions.provider.dialog.title.edit');
	return i18n.baseText('settings.promotions.provider.dialog.title.add', {
		interpolate: { type: i18n.baseText(`settings.promotions.providers.type.${form.type}`) },
	});
});

const ariaDescription = computed(() =>
	i18n.baseText(
		step.value === 'key'
			? 'settings.promotions.provider.dialog.key.ariaDescription'
			: 'settings.promotions.provider.dialog.ariaDescription',
	),
);

const storedPublicKey = computed(() => {
	const config = current.value?.config;
	return config && 'publicKey' in config ? config.publicKey : null;
});

const isInUse = computed(() => usedBy.value.length > 0);
const usedByNames = computed(() => [...new Set(usedBy.value.map(({ name }) => name))].join(', '));

const hasUsername = computed(() => form.username.trim().length > 0);
const hasPassword = computed(() => form.password.length > 0);
const hasHostUrlChange = computed(() => {
	const config = current.value?.config;
	return config && 'baseUrl' in config
		? !isSamePromotionHostUrl(config.baseUrl, form.baseUrl)
		: false;
});

// Token credentials change as a pair. Empty edit fields keep the stored credentials.
const areCredentialsIncomplete = computed(() => {
	if (form.authType !== 'token') return false;
	if (capabilities.value.tokenUsername)
		return (!isEdit.value || hasHostUrlChange.value) && !hasPassword.value;
	if (!isEdit.value) return !(hasUsername.value && hasPassword.value);
	if (!hasUsername.value && !hasPassword.value) return false;
	return !(hasUsername.value && hasPassword.value);
});

const hasChanges = computed(() => {
	if (!current.value) return true;
	return Object.keys(buildProviderUpdatePayload(form, current.value)).length > 0;
});

const saveDisabledReason = computed(() => {
	if (!form.name.trim()) return i18n.baseText('settings.promotions.provider.form.incomplete');
	if (capabilities.value.hasHostApi && !form.baseUrl.trim())
		return i18n.baseText('settings.promotions.provider.form.incomplete');
	if (areCredentialsIncomplete.value)
		return i18n.baseText('settings.promotions.provider.form.credentials.required');
	if (!hasChanges.value) return i18n.baseText('settings.promotions.provider.form.noChanges');
	return undefined;
});

const isSaveDisabled = computed(
	() => isSubmitting.value || isLoading.value || saveDisabledReason.value !== undefined,
);

function close() {
	emit('update:open', false);
}

function onOpenChange(value: boolean) {
	if (value || isSubmitting.value) return;
	close();
}

function focusStep() {
	void nextTick(() => {
		if (step.value === 'key') doneButton.value?.$el?.focus();
		else nameInput.value?.focus();
	});
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	focusStep();
}

// The component mounts after the dialog opens, so load it on mount.
onMounted(async () => {
	if (props.providerId === undefined) {
		focusStep();
		return;
	}

	isLoading.value = true;
	try {
		const [provider, environments] = await Promise.all([
			fetchPromotionProvider(rootStore.publicApiContext, props.providerId),
			fetchPromotionEnvironments(rootStore.publicApiContext, { providerId: props.providerId }),
		]);
		current.value = provider;
		usedBy.value = environments;
		Object.assign(form, providerFormFrom(provider));
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.provider.toast.error.load'));
		close();
	} finally {
		isLoading.value = false;
		focusStep();
	}
});

async function submit() {
	if (isSaveDisabled.value) return;

	const existing = current.value;
	isSubmitting.value = true;
	saveError.value = undefined;
	try {
		if (existing) {
			const payload = buildProviderUpdatePayload(form, existing);
			const updated = await updatePromotionProvider(
				rootStore.publicApiContext,
				existing.id,
				payload,
			);
			const rotatedKey =
				'publicKey' in updated.config && updated.config.publicKey !== storedPublicKey.value
					? updated.config.publicKey
					: null;
			current.value = updated;
			toast.showMessage({
				title: i18n.baseText('settings.promotions.provider.toast.updated'),
				type: 'success',
			});
			emit('saved', {
				id: updated.id,
				hostChanged: payload.config !== undefined,
				credentialsChanged: payload.auth !== undefined,
			});

			if (rotatedKey) {
				generatedPublicKey.value = rotatedKey;
				step.value = 'key';
				focusStep();
			} else {
				close();
			}
		} else {
			const created = await createPromotionProvider(
				rootStore.publicApiContext,
				buildProviderCreatePayload(form),
			);
			toast.showMessage({
				title: i18n.baseText('settings.promotions.provider.toast.created'),
				type: 'success',
			});
			emit('saved', { id: created.provider.id, hostChanged: false, credentialsChanged: false });

			if (created.publicKey) {
				generatedPublicKey.value = created.publicKey;
				step.value = 'key';
				focusStep();
			} else {
				close();
			}
		}
	} catch (error) {
		saveError.value =
			error instanceof Error
				? error.message
				: i18n.baseText('settings.promotions.provider.toast.error.save');
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<template>
	<PongDialog
		:open="open"
		size="medium"
		:aria-description="ariaDescription"
		data-test-id="promotion-provider-dialog"
		@open-auto-focus="onOpenAutoFocus"
		@update:open="onOpenChange"
	>
		<PongDialogHeader>
			<PongDialogTitle>{{ title }}</PongDialogTitle>
		</PongDialogHeader>

		<template v-if="step === 'key' && generatedPublicKey">
			<PongDialogBody>
				<div :class="$style.form" data-test-id="promotion-provider-key-step">
					<PongInputLabel :label="i18n.baseText('settings.promotions.provider.publicKey.label')">
						<PongCopyInput
							:value="generatedPublicKey"
							:label="i18n.baseText('settings.promotions.provider.publicKey.label')"
							:copy-label="i18n.baseText('settings.promotions.provider.publicKey.copy')"
							:copied-label="i18n.baseText('generic.copiedToClipboard')"
							data-test-id="promotion-provider-public-key"
						/>
						<PongText :class="$style.hint" size="small" color="text-light">
							{{ i18n.baseText('settings.promotions.provider.publicKey.hint') }}
						</PongText>
					</PongInputLabel>
				</div>
			</PongDialogBody>
			<PongDialogFooter>
				<PongButton ref="doneButton" data-test-id="promotion-provider-done-button" @click="close">
					{{
						i18n.baseText(isEdit ? 'generic.close' : 'settings.promotions.provider.dialog.continue')
					}}
				</PongButton>
			</PongDialogFooter>
		</template>

		<template v-else>
			<PongDialogBody>
				<form
					id="promotion-provider-form"
					:class="$style.form"
					data-test-id="promotion-provider-form-step"
					@submit.prevent="submit"
				>
					<PongNotice
						v-if="isEdit && isInUse"
						theme="warning"
						data-test-id="promotion-provider-in-use"
					>
						{{ i18n.baseText('settings.promotions.provider.inUse.warning') }}
						{{
							i18n.baseText('settings.promotions.provider.inUse.connections', {
								interpolate: { names: usedByNames },
							})
						}}
					</PongNotice>

					<PongInputLabel
						input-name="promotion-provider-name"
						:label="i18n.baseText('settings.promotions.provider.form.name')"
					>
						<PongInput
							id="promotion-provider-name"
							ref="nameInput"
							v-model="form.name"
							aria-required="true"
							:disabled="isLoading || isSubmitting"
							data-test-id="promotion-provider-name-input"
						/>
					</PongInputLabel>

					<PongInputLabel
						v-if="capabilities.hasHostApi"
						input-name="promotion-provider-base-url"
						:label="i18n.baseText('settings.promotions.provider.form.baseUrl')"
					>
						<PongInput
							id="promotion-provider-base-url"
							v-model="form.baseUrl"
							aria-required="true"
							:placeholder="i18n.baseText('settings.promotions.provider.form.baseUrl.placeholder')"
							:disabled="isLoading || isSubmitting"
							data-test-id="promotion-provider-base-url-input"
						/>
					</PongInputLabel>

					<PongInputLabel
						v-if="capabilities.authTypes.length > 1"
						input-name="promotion-provider-auth-type"
						:label="i18n.baseText('settings.promotions.provider.form.authType')"
						:tooltip-text="
							isEdit
								? i18n.baseText('settings.promotions.provider.form.authType.locked')
								: undefined
						"
					>
						<PongSelect
							id="promotion-provider-auth-type"
							v-model="form.authType"
							:teleported="false"
							:disabled="isLoading || isSubmitting || isEdit"
							data-test-id="promotion-provider-auth-type-select"
						>
							<PongOption
								value="ssh-key"
								:label="i18n.baseText('settings.promotions.providers.authType.sshKey')"
							/>
							<PongOption
								value="token"
								:label="i18n.baseText('settings.promotions.providers.authType.token')"
							/>
						</PongSelect>
					</PongInputLabel>

					<template v-if="form.authType === 'ssh-key'">
						<PongInputLabel
							v-if="!isEdit"
							input-name="promotion-provider-key-type"
							:label="i18n.baseText('settings.promotions.provider.form.keyType')"
						>
							<PongSelect
								id="promotion-provider-key-type"
								v-model="form.keyType"
								:teleported="false"
								:disabled="isLoading || isSubmitting"
								data-test-id="promotion-provider-key-type-select"
							>
								<PongOption value="ed25519" label="ED25519" />
								<PongOption value="rsa" label="RSA" />
							</PongSelect>
						</PongInputLabel>

						<PongInputLabel
							v-if="storedPublicKey"
							:label="i18n.baseText('settings.promotions.provider.publicKey.label')"
						>
							<PongCopyInput
								:value="storedPublicKey"
								:label="i18n.baseText('settings.promotions.provider.publicKey.label')"
								:copy-label="i18n.baseText('settings.promotions.provider.publicKey.copy')"
								:copied-label="i18n.baseText('generic.copiedToClipboard')"
								data-test-id="promotion-provider-public-key"
							/>
						</PongInputLabel>

						<div v-if="isEdit">
							<PongCheckbox
								v-model="form.regenerateKey"
								:label="i18n.baseText('settings.promotions.provider.regenerateKey')"
								:disabled="isLoading || isSubmitting"
								data-test-id="promotion-provider-regenerate-key"
							/>
							<PongText v-if="form.regenerateKey" size="small" color="text-light">
								{{ i18n.baseText('settings.promotions.provider.regenerateKey.hint') }}
							</PongText>
						</div>
					</template>

					<template v-else>
						<PongInputLabel
							v-if="!capabilities.tokenUsername"
							input-name="promotion-provider-username"
							:label="i18n.baseText('settings.promotions.provider.form.username')"
						>
							<PongInput
								id="promotion-provider-username"
								v-model="form.username"
								:aria-required="!isEdit"
								:disabled="isLoading || isSubmitting"
								data-test-id="promotion-provider-username-input"
							/>
						</PongInputLabel>

						<PongInputLabel
							input-name="promotion-provider-password"
							:label="
								i18n.baseText(
									capabilities.hasHostApi
										? 'settings.promotions.provider.form.accessToken'
										: 'settings.promotions.provider.form.password',
								)
							"
						>
							<PongInput
								id="promotion-provider-password"
								v-model="form.password"
								:aria-required="!isEdit || hasHostUrlChange"
								type="password"
								autocomplete="new-password"
								:placeholder="isEdit && !hasHostUrlChange ? '••••••••' : undefined"
								:disabled="isLoading || isSubmitting"
								data-test-id="promotion-provider-password-input"
							/>
						</PongInputLabel>

						<PongText
							v-if="!capabilities.tokenUsername && hasUsername !== hasPassword"
							size="small"
							color="danger"
						>
							{{ i18n.baseText('settings.promotions.provider.form.credentials.required') }}
						</PongText>

						<PongText
							v-if="isEdit && (!capabilities.hasHostApi || hasHostUrlChange)"
							size="small"
							:color="capabilities.hasHostApi ? 'text-base' : 'text-light'"
						>
							{{
								i18n.baseText(
									capabilities.hasHostApi
										? 'settings.promotions.provider.form.accessToken.urlChangeHint'
										: 'settings.promotions.provider.form.credentials.keepHint',
								)
							}}
						</PongText>
						<PongText v-if="capabilities.hasHostApi" size="small" color="text-base">
							{{ i18n.baseText('settings.promotions.provider.form.accessToken.hint') }}
						</PongText>
					</template>

					<PongNotice
						v-if="saveError"
						theme="danger"
						role="alert"
						data-test-id="promotion-provider-save-error"
					>
						{{ saveError }}
					</PongNotice>
				</form>
			</PongDialogBody>
			<PongDialogFooter>
				<PongButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="promotion-provider-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</PongButton>
				<PongButton
					type="submit"
					form="promotion-provider-form"
					:disabled="isSaveDisabled"
					:loading="isSubmitting"
					data-test-id="promotion-provider-save-button"
				>
					{{
						i18n.baseText(isEdit ? 'generic.save' : 'settings.promotions.provider.dialog.continue')
					}}
				</PongButton>
			</PongDialogFooter>
		</template>
	</PongDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.hint {
	display: block;
	margin-top: var(--spacing--2xs);
}
</style>
