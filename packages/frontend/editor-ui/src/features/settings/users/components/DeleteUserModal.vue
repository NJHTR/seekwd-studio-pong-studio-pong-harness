<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useToast } from '@pong/composables/useToast';
import ProjectSharing from '@/features/collaboration/projects/components/ProjectSharing.vue';
import { useUsersStore } from '@pong/stores/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { useRemoteProjectSearch } from '@/features/collaboration/projects/projects.utils';
import { useI18n } from '@pong/i18n';

import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongInput,
	PongInputLabel,
	PongRadioGroup,
	PongRadioGroupItem,
	PongText,
} from '@pong/design-system';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data: {
		userId: string;
		afterDelete?: () => Promise<void>;
	};
}>();

const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const loading = ref(false);
const operation = ref('');
const deleteConfirmText = ref('');
const selectedProject = ref<ProjectSharingData | null>(null);

const i18n = useI18n();
const usersStore = useUsersStore();

const userToDelete = computed(() => {
	if (!props.data?.userId) return null;

	return usersStore.usersList.state.items.find((user) => user.id === props.data.userId);
});

const isPending = computed(() => !userToDelete.value?.firstName);

const title = computed(() => {
	const user =
		userToDelete.value?.firstName && userToDelete.value.lastName
			? `${userToDelete.value.firstName} ${userToDelete.value.lastName}`
			: (userToDelete.value?.email ?? '');

	return i18n.baseText('settings.users.deleteUser', { interpolate: { user } });
});

const enabled = computed(() => {
	if (isPending.value) {
		return true;
	}

	if (
		operation.value === 'delete' &&
		deleteConfirmText.value === i18n.baseText('settings.users.deleteConfirmationText')
	) {
		return true;
	}

	return !!(operation.value === 'transfer' && selectedProject.value);
});

const searchFn = useRemoteProjectSearch();
const filterFn = (project: ProjectListItem) =>
	project.name !==
	`${userToDelete.value?.firstName} ${userToDelete.value?.lastName} <${userToDelete.value?.email}>`;

const { showMessage, showError } = useToast();

async function onSubmit() {
	if (loading.value || !enabled.value) {
		return;
	}

	try {
		loading.value = true;

		const params = { id: props.data.userId } as { id: string; transferId?: string };
		if (operation.value === 'transfer' && selectedProject.value) {
			params.transferId = selectedProject.value.id;
		}

		await usersStore.deleteUser(params);

		let message = '';
		if (params.transferId && selectedProject.value) {
			message = i18n.baseText('settings.users.transferredToUser', {
				interpolate: { projectName: selectedProject.value.name ?? '' },
			});
		}

		showMessage({
			type: 'success',
			title: i18n.baseText('settings.users.userDeleted'),
			message,
		});

		await props.data.afterDelete?.();
		closeDialog();
	} catch (error) {
		showError(error, i18n.baseText('settings.users.userDeletedError'));
	} finally {
		loading.value = false;
	}
}

async function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}
</script>

<template>
	<PongDialog :open="modalOpen" size="medium" :header="title" @update:open="onDialogOpenUpdate">
		<PongDialogBody>
			<form id="delete-user-form" data-test-id="delete-user-modal" @submit.prevent="onSubmit">
				<div v-if="isPending">
					<PongText color="text-base">{{
						i18n.baseText('settings.users.confirmUserDeletion')
					}}</PongText>
				</div>
				<div v-else :class="$style.content">
					<div>
						<PongText color="text-base">{{
							i18n.baseText('settings.users.confirmDataHandlingAfterDeletion')
						}}</PongText>
					</div>
					<PongRadioGroup v-model="operation">
						<PongRadioGroupItem value="transfer">
							<template #label>
								<PongText color="text-dark">{{
									i18n.baseText('settings.users.transferWorkflowsAndCredentials')
								}}</PongText>
							</template>
							<template #content>
								<div v-if="operation === 'transfer'" class="pt-2xs">
									<PongText color="text-dark">{{
										i18n.baseText('settings.users.transferWorkflowsAndCredentials.user')
									}}</PongText>
									<ProjectSharing
										v-model="selectedProject"
										class="pt-2xs"
										:search-fn="searchFn"
										:filter-fn="filterFn"
										:placeholder="
											i18n.baseText('settings.users.transferWorkflowsAndCredentials.placeholder')
										"
									/>
								</div>
							</template>
						</PongRadioGroupItem>
						<PongRadioGroupItem value="delete">
							<template #label>
								<PongText color="text-dark">{{
									i18n.baseText('settings.users.deleteWorkflowsAndCredentials')
								}}</PongText>
							</template>
							<template #content>
								<div v-if="operation === 'delete'" class="pt-2xs" data-test-id="delete-data-input">
									<PongInputLabel :label="i18n.baseText('settings.users.deleteConfirmationMessage')">
										<PongInput
											v-model="deleteConfirmText"
											:placeholder="i18n.baseText('settings.users.deleteConfirmationText')"
										/>
									</PongInputLabel>
								</div>
							</template>
						</PongRadioGroupItem>
					</PongRadioGroup>
				</div>
			</form>
		</PongDialogBody>
		<PongDialogFooter>
			<PongButton
				type="submit"
				form="delete-user-form"
				variant="destructive"
				:loading="loading"
				:disabled="!enabled"
				:label="i18n.baseText('settings.users.delete')"
				data-test-id="confirm-delete-user-button"
			/>
		</PongDialogFooter>
	</PongDialog>
</template>

<style lang="scss" module>
.content {
	> *:not(:last-child) {
		margin-bottom: var(--spacing--sm);
	}
}

.innerContent {
	> * {
		margin-bottom: var(--spacing--2xs);
	}
}
</style>
