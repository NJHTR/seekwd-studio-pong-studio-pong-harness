<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@pong/composables/useToast';
import { VIEWS } from '@/app/constants';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants/urls';
import { useRolesStore } from '@pong/stores/roles.store';
import { useSettingsStore } from '@pong/stores/settings.store';
import type { TabOptions } from '@pong/design-system';
import { PongNewBadge, PongButton, PongHeading, PongLink, PongTabs, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import InstanceRolesView from './instance/InstanceRolesView.vue';
import ProjectRolesView from './project/ProjectRolesView.vue';
import { useRBACStore } from '@pong/stores/rbac.store';

type RolesTab = 'instance' | 'project';
const DEFAULT_TAB: RolesTab = 'instance';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const rolesStore = useRolesStore();
const settingsStore = useSettingsStore();
const { showError } = useToast();
const rbacStore = useRBACStore();

function normalizeTab(value: unknown): RolesTab {
	return value === 'project' || !rbacStore.hasScope('role:manage') ? 'project' : DEFAULT_TAB;
}

const canManageInstanceRoles = computed(() => rbacStore.hasScope('role:manage'));

const activeTab = ref<RolesTab>(normalizeTab(route.query.tab));

function addRole() {
	void router.push({
		name: activeTab.value === 'project' ? VIEWS.PROJECT_NEW_ROLE : VIEWS.INSTANCE_NEW_ROLE,
	});
}

// Reflect the active tab in the button, mirroring the resource-scoped labels used
// on the workflows and credentials lists.
const addRoleLabel = computed(() =>
	i18n.baseText(activeTab.value === 'project' ? 'roles.addRole.project' : 'roles.addRole.instance'),
);

const tabOptions = computed<Array<TabOptions<RolesTab>>>(() => [
	{
		label: i18n.baseText('roles.tab.instance'),
		value: 'instance',
		disabled: !canManageInstanceRoles.value,
		tooltip: canManageInstanceRoles.value
			? undefined
			: i18n.baseText('roles.tab.instance.disabledTooltip'),
	},
	{ label: i18n.baseText('roles.tab.project'), value: 'project' },
]);

// Reflect tab selection in the URL (replace keeps history clean / back-button safe).
watch(activeTab, (tab) => {
	if (normalizeTab(route.query.tab) !== tab) {
		void router.replace({ query: { ...route.query, tab } });
	}
});

// Reflect external URL changes (back/forward, deep links) into the active tab.
watch(
	() => route.query.tab,
	(tab) => {
		activeTab.value = normalizeTab(tab);
	},
);

onMounted(async () => {
	useDocumentTitle().set(i18n.baseText('settings.roles'));
	try {
		await rolesStore.fetchRoles();
	} catch (error) {
		showError(error, i18n.baseText('roles.fetch.error'));
	}
});
</script>

<template>
	<div class="pb-xl">
		<div class="mb-m" :class="$style.headerTitle">
			<PongHeading tag="h1" size="2xlarge">
				{{ i18n.baseText('settings.roles') }}
			</PongHeading>
			<PongNewBadge :text="i18n.baseText('generic.new')" />
		</div>

		<PongText color="text-base" class="mb-xl" tag="p">
			{{ i18n.baseText('roles.description') }}
			<PongLink :href="CUSTOM_ROLES_DOCS_URL" target="_blank" new-window underline>{{
				i18n.baseText('roles.description.docsLink')
			}}</PongLink>
		</PongText>

		<div :class="$style.tabsRow" class="mb-l">
			<PongTabs v-model="activeTab" :options="tabOptions" data-test-id="roles-tabs" />
			<PongButton
				v-if="settingsStore.isCustomRolesFeatureEnabled"
				variant="solid"
				icon="plus"
				@click="addRole"
			>
				{{ addRoleLabel }}
			</PongButton>
		</div>

		<InstanceRolesView v-if="activeTab === 'instance' && canManageInstanceRoles" />
		<ProjectRolesView v-else />
	</div>
</template>

<style lang="css" module>
.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.tabsRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
</style>
