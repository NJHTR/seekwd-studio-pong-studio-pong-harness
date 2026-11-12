<script lang="ts" setup>
import { ROLE, type UsersList } from '@pong/api-types';
import type { Role } from '@pong/permissions';
import { computed, ref } from 'vue';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useRolesStore } from '@pong/stores/roles.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { VIEWS } from '@/app/constants';
import {
	TOTAL_INSTANCE_PERMISSIONS,
	countGrantedInstancePermissions,
} from '@/features/roles/instance/instanceRoleScopes';
import RoleSelectDropdown from '@/features/roles/components/RoleSelectDropdown.vue';

const props = withDefaults(
	defineProps<{
		data: UsersList['items'][number];
		loading?: boolean;
	}>(),
	{ loading: false },
);

const emit = defineEmits<{
	'update:role': [payload: { role: string; userId: string }];
}>();

const settingsStore = useSettingsStore();
const rolesStore = useRolesStore();

const currentRole = computed<string>(() => props.data.role ?? ROLE.Default);
// Resolve the label against the full global list (incl. owner) so non-editable rows render.
const selectedRole = computed(() =>
	rolesStore.roles.global.find((role) => role.slug === currentRole.value),
);
const isEditable = computed(
	() => currentRole.value !== ROLE.Owner && currentRole.value !== ROLE.Default,
);

const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
const canChangeRole = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'user:changeRole' } }),
);

const canManageRoles = computed(() => hasPermission(['rbac'], { rbac: { scope: 'role:manage' } }));

// Assignable instance roles (sorted, owner excluded).
const assignableRoles = computed(() => rolesStore.processedInstanceRoles);
const systemRoles = computed(() => assignableRoles.value.filter((role) => role.systemRole));
const customRoles = computed(() => rolesStore.customInstanceRoles);

const permissionCountFor = (role: Role) => countGrantedInstancePermissions(role.scopes ?? []);


const onRoleUpdate = (role: string) => {
	emit('update:role', { role, userId: props.data.id });
};
</script>

<template>
	<div :class="$style.roleCell">
		<RoleSelectDropdown
			v-if="isEditable && canChangeRole"
			:system-roles="systemRoles"
			:custom-roles="customRoles"
			:current-role="currentRole"
			:has-custom-roles-license="hasCustomRolesLicense"
			:can-manage-roles="canManageRoles"
			:add-custom-role-route-name="VIEWS.INSTANCE_NEW_ROLE"
			:loading="loading"
			:permission-count-fn="permissionCountFor"
			:total-permissions="TOTAL_INSTANCE_PERMISSIONS"
			:edit-route-name="VIEWS.INSTANCE_ROLE_SETTINGS"
			:view-route-name="VIEWS.INSTANCE_ROLE_VIEW"
			:from-view="VIEWS.USERS_SETTINGS"
			test-id="user-role-dropdown"
			@update:role="onRoleUpdate"
		/>
		<span v-else :class="$style.roleName">{{ selectedRole?.displayName }}</span>
		</div>
</template>

<style lang="scss" module>
/* Wrapper renders as if it weren't there. */
.roleCell {
	display: contents;
}

/* Non-editable role name — truncates so it doesn't overflow the adjacent column */
.roleName {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 200px;
}
</style>
