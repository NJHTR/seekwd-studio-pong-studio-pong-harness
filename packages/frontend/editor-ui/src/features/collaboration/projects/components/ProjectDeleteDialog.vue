<script lang="ts" setup>
import { ref, computed } from 'vue';
import type { Project, ProjectListItem, ProjectSharingData } from '../projects.types';
import ProjectSharing from './ProjectSharing.vue';
import { useAvailableProjectSearch } from '../projects.utils';
import type { ProjectSearchFn } from '../projects.utils';
import { useI18n } from '@pong/i18n';
import type { ResourceCounts } from '../projects.store';
import { APP_MODALS_ELEMENT_ID } from '@/app/constants';

import { ElDialog } from 'element-plus';
import {
	PongButton,
	PongDialogFooter,
	PongInput,
	PongInputLabel,
	PongRadioGroup,
	PongRadioGroupItem,
	PongText,
} from '@pong/design-system';
type Props = {
	currentProject: Project | null;
	searchFn?: ProjectSearchFn;
	resourceCounts: ResourceCounts;
};

const props = defineProps<Props>();
const visible = defineModel<boolean>();

const resolvedSearchFn = computed(() => props.searchFn ?? useAvailableProjectSearch());
const filterFn = (project: ProjectListItem) => project.id !== props.currentProject?.id;
const emit = defineEmits<{
	confirmDelete: [value?: string];
}>();

const locale = useI18n();

const selectedProject = ref<ProjectSharingData | null>(null);
const operation = ref<'transfer' | 'wipe' | null>(null);
const wipeConfirmText = ref('');
const hasMovableResources = computed(
	() =>
		props.resourceCounts.credentials +
			props.resourceCounts.workflows +
			props.resourceCounts.dataTables >
		0,
);
const isValid = computed(() => {
	const expectedWipeConfirmation = locale.baseText(
		'projects.settings.delete.question.wipe.placeholder',
	);

	return (
		!hasMovableResources.value ||
		(operation.value === 'transfer' && !!selectedProject.value) ||
		(operation.value === 'wipe' && wipeConfirmText.value === expectedWipeConfirmation)
	);
});

const onDelete = () => {
	if (!isValid.value) {
		return;
	}

	if (operation.value === 'wipe') {
		selectedProject.value = null;
	}

	emit('confirmDelete', selectedProject.value?.id);
};

function onOperation(value: string | undefined) {
	if (value === 'transfer' || value === 'wipe') {
		operation.value = value;
	}
}
</script>
<template>
	<ElDialog
		v-model="visible"
		:title="
			locale.baseText('projects.settings.delete.title', {
				interpolate: { projectName: props.currentProject?.name ?? '' },
			})
		"
		width="650"
		:append-to="`#${APP_MODALS_ELEMENT_ID}`"
	>
		<PongText v-if="!hasMovableResources" color="text-base">{{
			locale.baseText('projects.settings.delete.message.empty')
		}}</PongText>
		<div v-else-if="hasMovableResources">
			<PongText color="text-base">{{ locale.baseText('projects.settings.delete.message') }}</PongText>
			<div class="pt-l">
				<PongRadioGroup :model-value="operation ?? undefined" @update:model-value="onOperation">
					<PongRadioGroupItem value="transfer">
						<template #label>
							<PongText color="text-dark">{{
								locale.baseText('projects.settings.delete.question.transfer.label')
							}}</PongText>
						</template>
						<template #content>
							<div v-if="operation === 'transfer'" class="pt-2xs">
								<PongText color="text-dark">{{
									locale.baseText('projects.settings.delete.question.transfer.title')
								}}</PongText>
								<ProjectSharing
									v-model="selectedProject"
									class="pt-2xs"
									:search-fn="resolvedSearchFn"
									:filter-fn="filterFn"
									:empty-options-text="locale.baseText('projects.sharing.noMatchingProjects')"
								/>
							</div>
						</template>
					</PongRadioGroupItem>

					<PongRadioGroupItem value="wipe">
						<template #label>
							<PongText color="text-dark">{{
								locale.baseText('projects.settings.delete.question.wipe.label')
							}}</PongText>
						</template>
						<template #content>
							<div v-if="operation === 'wipe'" class="pt-2xs">
								<PongInputLabel
									:label="locale.baseText('projects.settings.delete.question.wipe.title')"
								>
									<PongInput
										v-model="wipeConfirmText"
										data-test-id="project-delete-confirm-input"
										:placeholder="
											locale.baseText('projects.settings.delete.question.wipe.placeholder')
										"
									/>
								</PongInputLabel>
							</div>
						</template>
					</PongRadioGroupItem>
				</PongRadioGroup>
			</div>
		</div>
		<template #footer>
			<PongDialogFooter>
				<PongButton
					variant="destructive"
					type="button"
					:disabled="!isValid"
					data-test-id="project-settings-delete-confirm-button"
					@click.stop.prevent="onDelete"
					>{{ locale.baseText('projects.settings.danger.deleteProject') }}</PongButton
				>
			</PongDialogFooter>
		</template>
	</ElDialog>
</template>
