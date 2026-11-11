<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { UserProject } from '@pong/api-types';
import { useI18n } from '@pong/i18n';
import {
	PongDialog,
	PongDialogBody,
	PongDialogHeader,
	PongDialogTitle,
	PongText,
	PongInput,
	PongIcon,
} from '@pong/design-system';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useRolesStore } from '@pong/stores/roles.store';

const props = defineProps<{
	open: boolean;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	projects: UserProject[];
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const projectNameFilter = ref('');

const i18n = useI18n();
const rolesStore = useRolesStore();

const roleDisplayNameMap = computed(
	() => new Map(rolesStore.roles.project.map((role) => [role.slug, role.displayName])),
);

function getRoleDisplayName(slug: string): string {
	return roleDisplayNameMap.value.get(slug) ?? slug;
}

const userName = computed(
	() => [props.firstName, props.lastName].filter(Boolean).join(' ').trim() || props.email || '',
);

const projectsToShow = computed(() => {
	const query = projectNameFilter.value.trim().toLowerCase();
	if (!query) return props.projects;

	return props.projects.filter((project) => project.name.toLowerCase().includes(query));
});
</script>

<template>
	<PongDialog
		:open="open"
		size="medium"
		style="max-height: 50vh"
		@update:open="emit('update:open', $event)"
	>
		<PongDialogHeader :class="$style.header">
			<PongDialogTitle :class="$style.title">
				{{
					i18n.baseText('settings.users.projectsModal.title', { interpolate: { user: userName } })
				}}
			</PongDialogTitle>
			<PongInput
				v-model="projectNameFilter"
				:placeholder="i18n.baseText('settings.users.projectsModal.searchPlaceholder')"
				clearable
				data-test-id="user-projects-modal-search"
			>
				<template #prefix>
					<PongIcon icon="search" />
				</template>
			</PongInput>
		</PongDialogHeader>
		<PongDialogBody :class="$style.body">
			<div :class="$style.list">
				<PongText
					v-if="projectsToShow.length === 0"
					:class="$style.empty"
					color="text-light"
					size="small"
				>
					{{ i18n.baseText('settings.users.projectsModal.noResults') }}
				</PongText>
				<div v-for="p in projectsToShow" :key="p.id" :class="$style.row">
					<ProjectIcon :icon="p.icon ?? DEFAULT_PROJECT_ICON" size="medium" round />
					<div :class="$style.info">
						<PongText>{{ p.name }}</PongText>
						<PongText color="text-light" size="small">
							{{ getRoleDisplayName(p.role) }}
						</PongText>
					</div>
				</div>
			</div>
		</PongDialogBody>
	</PongDialog>
</template>

<style lang="scss" module>
.header {
	flex-direction: column;
	align-items: stretch;
	padding-inline-end: var(--pong-dialog-region--padding, var(--spacing--md));
	gap: var(--spacing--sm);
}

.body {
	padding: 0;
}

.title {
	padding-inline-end: calc(var(--pong-dialog-close--size, var(--spacing--lg)) + var(--spacing--xs));
}

.list {
	padding-inline: var(--pong-dialog-region--padding, var(--spacing--md));
	padding-block-end: var(--pong-dialog-region--padding, var(--spacing--md));
}

.empty {
	display: block;
	padding: var(--spacing--sm) 0;
	text-align: center;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border);

	&:last-child {
		border-bottom: none;
	}
}

.info {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	min-width: 0;
}
</style>
