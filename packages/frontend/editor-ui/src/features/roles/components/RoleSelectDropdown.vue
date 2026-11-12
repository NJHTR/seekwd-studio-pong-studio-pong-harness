<script lang="ts" setup>
import { PongBadge, PongIcon, PongSelect2, PongText, PongTooltip } from '@pong/design-system';
import type { SelectItem, SelectOptionBase, SelectValue, SelectVariants } from '@pong/design-system';
import type { Role } from '@pong/permissions';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@pong/i18n';
import { useTelemetry } from '@pong/composables/useTelemetry';
import RoleHoverPopover from './RoleHoverPopover.vue';
import RoleContactAdminModal from './RoleContactAdminModal.vue';

interface RoleSelectOption extends SelectOptionBase<string> {
	role: Role;
	requiresUpgrade?: boolean;
}

const isRoleSelectOption = (item: SelectOptionBase): item is RoleSelectOption =>
	'role' in item && item.role !== undefined;

const toRoleSelectOption = (role: Role): RoleSelectOption => ({
	value: role.slug,
	label: role.displayName,
	role,
	requiresUpgrade: !role.licensed,
});

const props = withDefaults(
	defineProps<{
		systemRoles: Role[];
		customRoles: Role[];
		currentRole: string;
		hasCustomRolesLicense: boolean;
		canManageRoles: boolean;
		addCustomRoleRouteName: string;
		loading?: boolean;
		disabled?: boolean;
		testId?: string;
		variant?: SelectVariants;
		// Shown in the trigger when no role is selected (e.g. an unset mapping rule).
		placeholder?: string;
		// Optional terminal (non-role) option rendered after a separator at the
		// bottom of the list, e.g. "Block access". Selecting it emits its value.
		terminalOption?: { value: string; label: string };
		// Optional RoleHoverPopover overrides — defaults to project-scoped values when omitted.
		permissionCountFn?: (role: Role) => number;
		totalPermissions?: number;
		editRouteName?: string;
		viewRouteName?: string;
		fromView?: string;
	}>(),
	{
		loading: false,
		disabled: false,
		testId: 'role-dropdown',
		variant: 'flush',
		placeholder: undefined,
		terminalOption: undefined,
		permissionCountFn: undefined,
		totalPermissions: undefined,
		editRouteName: undefined,
		viewRouteName: undefined,
		fromView: undefined,
	},
);

const emit = defineEmits<{
	'update:role': [role: string];
	/** Emitted when the user selects an unlicensed system role. Parent decides how to surface the upgrade flow. */
	'system-role-upgrade-needed': [];
}>();

const i18n = useI18n();
const router = useRouter();
const telemetry = useTelemetry();

const dropdownOpen = ref(false);
const contactAdminModalVisible = ref(false);

watch(dropdownOpen, (open) => {
	if (!open) {
		// Delay blur to run after Reka UI's internal focus management restores trigger focus
		setTimeout(() => {
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
		}, 0);
	}
});

const closeDropdown = () => {
	dropdownOpen.value = false;
};

const selectedRole = computed(() =>
	[...props.systemRoles, ...props.customRoles].find((role) => role.slug === props.currentRole),
);

// Trigger label: a real role's name, or the terminal option's label when selected.
const selectedLabel = computed(() => {
	if (selectedRole.value) return selectedRole.value.displayName;
	if (props.terminalOption && props.currentRole === props.terminalOption.value) {
		return props.terminalOption.label;
	}
	return undefined;
});

const roleItems = computed<SelectItem[]>(() => {
	const items: SelectItem[] = [];

	if (props.systemRoles.length > 0) {
		items.push({
			type: 'group',
			label: i18n.baseText('projects.settings.role.selector.section.system'),
			items: props.systemRoles.map(toRoleSelectOption),
		});
	}

	if (props.customRoles.length > 0 || !props.hasCustomRolesLicense) {
		items.push({
			type: 'group',
			label: i18n.baseText('projects.settings.role.selector.section.custom'),
			items: props.customRoles.map(toRoleSelectOption),
		});
	}

	if (props.terminalOption) {
		if (items.length > 0) {
			items.push({ type: 'separator' });
		}
		items.push({ value: props.terminalOption.value, label: props.terminalOption.label });
	}

	return items;
});

const onRoleSelect = (value: SelectValue | undefined) => {
	if (!value || typeof value !== 'string') return;
	const role = [...props.systemRoles, ...props.customRoles].find((r) => r.slug === value);
	emit('update:role', value);
};

const onAddCustomRoleClick = () => {
	telemetry.track('User clicked add custom role from role selector');
	closeDropdown();
	if (!props.canManageRoles) {
		contactAdminModalVisible.value = true;
	} else {
		void router.push({ name: props.addCustomRoleRouteName });
	}
};

const isUnavailableRoleItem = (item: SelectOptionBase) =>
	'requiresUpgrade' in item && item.requiresUpgrade === true;
</script>

<template>
	<div :class="$style.container">
		<PongSelect2
			v-model:open="dropdownOpen"
			:items="roleItems"
			:model-value="currentRole"
			size="small"
			:variant="variant"
			:placeholder="placeholder"
			:disabled="loading || disabled"
			:data-test-id="testId"
			@update:model-value="onRoleSelect"
		>
			<template #default>
				<PongTooltip
					:content="selectedLabel"
					:disabled="!selectedLabel || dropdownOpen"
					placement="top"
					as-child
				>
					<span>
						{{ selectedLabel ?? placeholder }}
						<PongIcon v-if="loading" icon="spinner" spin size="small" />
					</span>
				</PongTooltip>
			</template>

			<template #item-label="{ item }">
				<RoleHoverPopover
					v-if="isRoleSelectOption(item)"
					:role="item.role"
					:permission-count="permissionCountFn ? permissionCountFn(item.role) : undefined"
					:total-permissions="totalPermissions"
					:edit-route-name="editRouteName"
					:view-route-name="viewRouteName"
					:from-view="fromView"
				>
					<PongText
						tag="span"
						size="medium"
						:color="isUnavailableRoleItem(item) ? 'text-light' : 'text-dark'"
						:class="$style.itemLabel"
					>
						{{ item.label }}
					</PongText>
				</RoleHoverPopover>
				<template v-else>
					{{ item.label }}
				</template>
			</template>

			<template #item-trailing="{ item, ui }">
				<PongBadge
					v-if="isUnavailableRoleItem(item)"
					variant="warning"
					v-bind="ui"
					:class="$style.upgradeBadge"
				>
					{{ i18n.baseText('generic.upgrade') }}
				</PongBadge>
			</template>

			<template #label="{ item }">
				<span :class="$style.sectionLabelContent">
					{{ item.label }}
				</span>
			</template>

			<template #footer>
				<button
					type="button"
					:class="$style.addCustomRoleButton"
					@click.stop="onAddCustomRoleClick"
				>
					<PongIcon icon="plus" size="small" />
					<PongText tag="span" size="small">
						{{ i18n.baseText('projects.settings.role.selector.addCustomRole') }}
					</PongText>
				</button>
			</template>
		</PongSelect2>

		<RoleContactAdminModal
			v-model="contactAdminModalVisible"
			:custom-roles-exist="customRoles.length > 0"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: inline-flex;
	min-width: 0;
	overflow: hidden;
}

.itemLabel {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 180px;
}

.upgradeBadge {
	cursor: pointer;
}

.sectionLabelContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.sectionUpgradeBadge {
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.addCustomRoleButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	min-height: var(--height--xl);
	padding: 0 var(--spacing--xs);
	border: none;
	background: transparent;
	cursor: pointer;
	color: var(--color--primary);

	&:hover {
		background-color: var(--color--background--light-1);
	}
}
</style>
