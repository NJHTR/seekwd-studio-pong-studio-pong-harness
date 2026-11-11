<script setup lang="ts">
import { useRolesStore } from '@pong/stores/roles.store';
import {
	PongDialog,
	PongDialogBody,
	PongDialogHeader,
	PongDialogTitle,
	PongIconButton,
	PongLoading,
	PongText,
	PongUserInfo,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { ref, watch } from 'vue';

import type { RoleProjectMembersResponse } from '@pong/api-types';

const props = defineProps<{
	open: boolean;
	projectId: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const rolesStore = useRolesStore();
const i18n = useI18n();

const membersData = ref<RoleProjectMembersResponse>({ members: [] });
const isLoading = ref(false);

watch(
	() => props.open,
	async (isOpen) => {
		if (!isOpen) return;

		isLoading.value = true;
		try {
			membersData.value = await rolesStore.fetchRoleProjectMembers(
				'project:admin',
				props.projectId,
			);
		} finally {
			isLoading.value = false;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<PongDialog
		:open="open"
		size="medium"
		:show-close-button="false"
		@update:open="emit('update:open', $event)"
	>
		<PongDialogHeader>
			<div :class="$style.header">
				<PongIconButton
					icon="chevron-left"
					variant="ghost"
					size="small"
					:aria-label="i18n.baseText('generic.back')"
					@click="emit('update:open', false)"
				/>
				<PongDialogTitle>
					{{ i18n.baseText('workflowSettings.redactionMembersModal.title') }}
				</PongDialogTitle>
			</div>
		</PongDialogHeader>
		<PongDialogBody :class="$style.body">
			<PongText color="text-base" size="small" :class="$style.description">
				{{ i18n.baseText('workflowSettings.redactionMembersModal.description') }}
			</PongText>
			<PongLoading v-if="isLoading" :rows="3" />
			<div v-else :class="$style.memberList">
				<div v-for="member in membersData.members" :key="member.userId" :class="$style.memberRow">
					<PongUserInfo
						:first-name="member.firstName"
						:last-name="member.lastName"
						:email="member.email"
					/>
				</div>
			</div>
		</PongDialogBody>
	</PongDialog>
</template>

<style lang="css" module>
.body {
	max-height: 400px;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.description {
	display: block;
	margin-bottom: var(--spacing--sm);
}

.memberList {
	display: flex;
	flex-direction: column;
}

.memberRow {
	display: flex;
	align-items: center;
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border);
}

.memberRow:last-child {
	border-bottom: none;
}
</style>
