<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import { useRootStore } from '@pong/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { createEventBus } from '@pong/utils/event-bus';
import { getAllCredentials } from '@/features/credentials/credentials.api';
import {
	deleteSecretProviderConnection,
	deleteProjectSecretProviderConnection,
} from '@pong/rest-api-client';
import Modal from '@/app/components/Modal.vue';
import { PongButton, PongInput, PongLink, PongInputLabel, PongText } from '@pong/design-system';
import { SECRETS_PROVIDER_CONNECTION_MODAL_KEY, VIEWS } from '@/app/constants';

interface Props {
	modalName: string;
	data: {
		providerKey: string;
		providerName: string;
		secretsCount: number;
		projectId?: string;
		onConfirm?: () => Promise<void>;
	};
}

const props = defineProps<Props>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const uiStore = useUIStore();
const modalBus = createEventBus();

const confirmationText = ref('');
const isDeleting = ref(false);
const credentialsCount = ref(0);
const isLoadingCredentials = ref(true);

const shouldShowConfirmation = computed(() => credentialsCount.value > 0);

const deleteEnabled = computed(
	() => !shouldShowConfirmation.value || confirmationText.value === props.data.providerName,
);

const credentialsPageUrl = computed(() => ({
	name: VIEWS.CREDENTIALS,
	query: {
		externalSecretsStore: props.data.providerKey,
	},
}));

const secretsLabel = computed(() => {
	const count = props.data.secretsCount;
	if (count === 1) {
		return i18n.baseText('settings.secretsProviderConnections.oneSecret');
	}
	return i18n.baseText('settings.secretsProviderConnections.secrets', {
		interpolate: { count: count.toString() },
	});
});

const credentialsLabel = computed(() => {
	const count = credentialsCount.value;
	if (count === 1) {
		return i18n.baseText('settings.secretsProviderConnections.delete.impact.oneCredential');
	}
	return i18n.baseText('settings.secretsProviderConnections.delete.impact.credentials', {
		interpolate: { count: count.toString() },
	});
});

onMounted(async () => {
	isLoadingCredentials.value = true;
	try {
		// Fetch credentials count that use this provider
		const credentials = await getAllCredentials(rootStore.restApiContext, {
			includeGlobal: true,
			externalSecretsStore: props.data.providerKey,
		});
		credentialsCount.value = credentials.length;
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('error'));
	} finally {
		isLoadingCredentials.value = false;
	}
});

async function onConfirmDelete() {
	isDeleting.value = true;
	try {
		if (props.data.projectId) {
			await deleteProjectSecretProviderConnection(
				rootStore.restApiContext,
				props.data.projectId,
				props.data.providerKey,
			);
		} else {
			await deleteSecretProviderConnection(rootStore.restApiContext, props.data.providerKey);
		}

		toast.showMessage({
			title: i18n.baseText('settings.secretsProviderConnections.delete.success', {
				interpolate: { name: props.data.providerName },
			}),
			type: 'success',
		});

		if (props.data.onConfirm) {
			await props.data.onConfirm();
		}

		uiStore.closeModal(props.modalName);
		uiStore.closeModal(SECRETS_PROVIDER_CONNECTION_MODAL_KEY);
	} catch (error) {
		toast.showError(
			error as Error,
			i18n.baseText('settings.secretsProviderConnections.delete.error'),
		);
	} finally {
		isDeleting.value = false;
	}
}

function onCancel() {
	uiStore.closeModal(props.modalName);
}
</script>

<template>
	<Modal
		:name="modalName"
		:title="
			i18n.baseText('settings.secretsProviderConnections.delete.title', {
				interpolate: { name: data.providerName },
			})
		"
		:event-bus="modalBus"
		width="540px"
	>
		<template #content>
			<div v-if="shouldShowConfirmation" :class="$style.content">
				<PongText size="medium" color="text-base">
					{{
						i18n.baseText('settings.secretsProviderConnections.delete.description', {
							interpolate: {
								name: data.providerName,
								secretsCount: secretsLabel,
							},
						})
					}}
				</PongText>

				<div v-if="!isLoadingCredentials" :class="$style.impact">
					<PongText size="medium" color="text-base" bold>
						{{ i18n.baseText('settings.secretsProviderConnections.delete.impact.title') }}
					</PongText>
					<ul>
						<li>
							<PongText size="medium" color="text-base">
								<PongLink data-test-id="credentials-link" :to="credentialsPageUrl" target="_blank">
									{{ credentialsLabel }}
								</PongLink>
								{{ i18n.baseText('settings.secretsProviderConnections.delete.impact.description') }}
							</PongText>
						</li>
					</ul>
				</div>

				<div :class="$style.confirmation">
					<PongInputLabel
						:label="
							i18n.baseText('settings.secretsProviderConnections.delete.confirmationLabel', {
								interpolate: { name: data.providerName },
							})
						"
						size="small"
					>
						<PongInput
							v-model="confirmationText"
							:placeholder="data.providerName"
							data-test-id="delete-confirmation-input"
						/>
					</PongInputLabel>
				</div>
			</div>
			<div v-else :class="$style.content">
				<PongText size="medium" color="text-base">
					{{ i18n.baseText('settings.secretsProviderConnections.delete.description.noImpact') }}
				</PongText>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<PongButton variant="outline" @click="onCancel">
					{{ i18n.baseText('generic.cancel') }}
				</PongButton>
				<PongButton
					variant="destructive"
					:disabled="!deleteEnabled"
					:loading="isDeleting"
					data-test-id="confirm-delete-button"
					@click="onConfirmDelete"
				>
					{{ i18n.baseText('generic.delete') }}
				</PongButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.impact {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.confirmation {
	margin-top: var(--spacing--xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
