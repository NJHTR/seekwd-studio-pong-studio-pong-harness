<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { useRolesStore } from '@pong/stores/roles.store';
import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongDialogHeader,
	PongDialogTitle,
	PongLoading,
	PongText,
	PongUserInfo,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { RoleProjectMembersResponse } from '@pong/api-types';

const props = defineProps<{
	open: boolean;
	roleSlug: string;
	projectId: string;
	projectName: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const rolesStore = useRolesStore();
const i18n = useI18n();
const router = useRouter();

const membersData = ref<RoleProjectMembersResponse>({ members: [] });
const isLoading = ref(false);

watch(
	() => props.open,
	async (isOpen) => {
		if (!isOpen) return;

		isLoading.value = true;
		try {
			membersData.value = await rolesStore.fetchRoleProjectMembers(props.roleSlug, props.projectId);
		} finally {
			isLoading.value = false;
		}
	},
	{ immediate: true },
);

const roleDisplayNameMap = computed(() => {
	const allRoles = [
		...rolesStore.roles.global,
		...rolesStore.roles.project,
		...rolesStore.roles.credential,
		...rolesStore.roles.workflow,
	];
	return new Map(allRoles.map((r) => [r.slug, r.displayName]));
});

function getRoleDisplayName(slug: string): string {
	return roleDisplayNameMap.value.get(slug) ?? slug;
}

function navigateToProjectSettings() {
	emit('update:open', false);
	void router.push({
		name: VIEWS.PROJECT_SETTINGS,
		params: { projectId: props.projectId },
	});
}
</script>

<template>
	<PongDialog :open="open" size="medium" @update:open="emit('update:open', $event)">
		<PongDialogHeader>
			<PongDialogTitle>
				{{
					i18n.baseText('projectRoles.assignments.membersModal.title', {
						interpolate: { projectName },
					})
				}}
			</PongDialogTitle>
		</PongDialogHeader>

		<PongDialogBody :class="$style.body">
			<PongLoading v-if="isLoading" :rows="3" />
			<div v-else :class="$style.memberList">
				<div v-for="member in membersData.members" :key="member.userId" :class="$style.memberRow">
					<PongUserInfo
						:first-name="member.firstName"
						:last-name="member.lastName"
						:email="member.email"
					/>
					<PongText :class="$style.roleLabel" color="text-light" size="small">
						{{ getRoleDisplayName(member.role) }}
					</PongText>
				</div>
			</div>
		</PongDialogBody>

		<PongDialogFooter>
			<PongButton variant="outline" @click="emit('update:open', false)">
				{{ i18n.baseText('projectRoles.assignments.membersModal.cancel') }}
			</PongButton>
			<PongButton @click="navigateToProjectSettings">
				{{ i18n.baseText('projectRoles.assignments.membersModal.manageMembers') }}
			</PongButton>
		</PongDialogFooter>
	</PongDialog>
</template>

<style lang="css" module>
.body {
	max-height: 400px;
}

.memberList {
	display: flex;
	flex-direction: column;
}

.memberRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border);
}

.memberRow:last-child {
	border-bottom: none;
}

.roleLabel {
	flex-shrink: 0;
	margin-left: var(--spacing--sm);
}
</style>
