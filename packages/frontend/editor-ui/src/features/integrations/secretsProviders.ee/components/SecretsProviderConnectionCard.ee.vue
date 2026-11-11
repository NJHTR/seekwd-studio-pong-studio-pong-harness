<script lang="ts" setup>
import { computed, toRef } from 'vue';
import SecretsProviderImage from './SecretsProviderImage.ee.vue';
import {
	PongActionToggle,
	PongBadge,
	PongCard,
	PongHeading,
	PongText,
	PongTooltip,
} from '@pong/design-system';
import type { SecretProviderConnection, SecretProviderTypeResponse } from '@pong/api-types';
import { DateTime } from 'luxon';
import { isDateObject } from '@/app/utils/typeGuards';
import { useI18n } from '@pong/i18n';
import { useRBACStore } from '@pong/stores/rbac.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { isIconOrEmoji, type IconOrEmoji } from '@pong/design-system';
import { useSettingsStore } from '@pong/stores/settings.store';

const i18n = useI18n();
const rbacStore = useRBACStore();
const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();
const isProjectScopedSecretsEnabled =
	settingsStore.moduleSettings['external-secrets']?.forProjects ?? false;

const props = defineProps<{
	provider: SecretProviderConnection;
	providerTypeInfo?: SecretProviderTypeResponse;
	project?: ProjectListItem | null;
	canUpdate: boolean;
}>();

const emit = defineEmits<{
	edit: [providerKey: string];
	share: [providerKey: string];
	reload: [providerKey: string];
	delete: [providerKey: string];
	activate: [providerKey: string];
}>();

const provider = toRef(props, 'provider');
const providerTypeInfo = toRef(props, 'providerTypeInfo');

const formattedDate = computed(() => {
	return DateTime.fromISO(
		isDateObject(provider.value.createdAt)
			? provider.value.createdAt.toISOString()
			: provider.value.createdAt || new Date().toISOString(),
	).toFormat('dd LLL yyyy');
});

const showDisconnectedBadge = computed(() => {
	return provider.value.state === 'error';
});

const isDisabled = computed(() => provider.value.isEnabled === false);

const canDelete = computed(() => {
	if (rbacStore.hasScope('externalSecretsProvider:delete')) return true;
	if (provider.value.projects.length > 0) {
		return provider.value.projects.every((p) => {
			const project = projectsStore.myProjects.find((mp) => mp.id === p.id);
			return project?.scopes?.includes('externalSecretsProvider:delete') ?? false;
		});
	}
	return false;
});

const canSync = computed(() => {
	if (rbacStore.hasScope('externalSecretsProvider:sync')) return true;
	if (provider.value.projects.length > 0) {
		return provider.value.projects.every((p) => {
			const project = projectsStore.myProjects.find((mp) => mp.id === p.id);
			return project?.scopes?.includes('externalSecretsProvider:sync') ?? false;
		});
	}
	return false;
});

const isGlobal = computed(() => provider.value.projects.length === 0);

const projectName = computed(() => {
	if (props.project) {
		const { name, email } = splitName(props.project.name ?? undefined);
		return name ?? email ?? '';
	}
	return '';
});

const badgeIcon = computed<IconOrEmoji>(() => {
	if (isGlobal.value) {
		return { type: 'icon', value: 'globe' };
	}
	return isIconOrEmoji(props.project?.icon)
		? props.project.icon
		: { type: 'icon', value: 'layers' };
});

const badgeTooltip = computed(() => {
	if (isGlobal.value) {
		return i18n.baseText('settings.secretsProviderConnections.badge.tooltip.global');
	}
	return i18n.baseText('settings.secretsProviderConnections.badge.tooltip.project', {
		interpolate: {
			projectName: projectName.value,
		},
	});
});

const actionDropdownOptions = computed(() => {
	if (!props.canUpdate) return [];

	const options = [
		{
			label: i18n.baseText('generic.edit'),
			value: 'edit',
		},
	];

	if (isDisabled.value) {
		options.push({
			label: i18n.baseText('generic.activate'),
			value: 'activate',
		});
	}

	if (isProjectScopedSecretsEnabled) {
		options.push({
			label: i18n.baseText('settings.secretsProviderConnections.actions.share'),
			value: 'share',
		});
	}

	if (provider.value.state === 'connected' && canSync.value && !isDisabled.value) {
		options.push({
			label: i18n.baseText('settings.externalSecrets.card.actionDropdown.reload'),
			value: 'reload',
		});
	}

	if (canDelete.value) {
		options.push({
			label: i18n.baseText('generic.delete'),
			value: 'delete',
		});
	}

	return options;
});

function onAction(action: string) {
	if (action === 'edit') {
		emit('edit', provider.value.name);
	} else if (action === 'activate') {
		emit('activate', provider.value.name);
	} else if (action === 'share') {
		emit('share', provider.value.name);
	} else if (action === 'reload') {
		emit('reload', provider.value.name);
	} else if (action === 'delete') {
		emit('delete', provider.value.name);
	}
}
</script>

<template>
	<PongCard :class="$style.card">
		<template v-if="providerTypeInfo" #prepend>
			<SecretsProviderImage
				:class="$style.providerImage"
				:provider="providerTypeInfo"
				data-test-id="secrets-provider-image"
			/>
		</template>
		<template #header>
			<div :class="$style.headerContainer">
				<PongHeading tag="h2" bold data-test-id="secrets-provider-name">{{
					provider.name
				}}</PongHeading>
				<PongBadge v-if="isDisabled" variant="outline" size="xsmall" data-test-id="disabled-badge">
					{{ i18n.baseText('settings.secretsProviderConnections.state.disabled') }}
				</PongBadge>
				<PongBadge
					v-else-if="showDisconnectedBadge"
					variant="warning"
					size="xsmall"
					data-test-id="disconnected-badge"
				>
					{{ i18n.baseText('settings.secretsProviderConnections.state.disconnected') }}
				</PongBadge>
			</div>
		</template>
		<template #default>
			<PongText class="pb-4xs" color="text-light" size="small">
				<span data-test-id="secrets-provider-display-name">
					{{ providerTypeInfo?.displayName ?? provider.type }}
				</span>
				|
				<span data-test-id="secrets-provider-secrets-count">
					{{
						i18n.baseText('settings.externalSecrets.card.secretsCount', {
							interpolate: { count: provider.secretsCount },
							adjustToNumber: provider.secretsCount,
						})
					}}
				</span>
				|
				<span data-test-id="secrets-provider-created-at">
					{{
						i18n.baseText('settings.secretsProviderConnections.card.createdAt', {
							interpolate: {
								date: formattedDate,
							},
						})
					}}
				</span>
			</PongText>
		</template>
		<template #append>
			<PongTooltip v-if="!isDisabled" :class="$style.cardBadge" placement="top">
				<PongBadge
					:class="$style.badge"
					variant="outline"
					:data-test-id="
						isGlobal ? 'secrets-provider-global-badge' : 'secrets-provider-project-badge'
					"
				>
					<ProjectIcon :icon="badgeIcon" :border-less="true" size="mini" />
					<span v-if="!isGlobal" v-pong-truncate:20="projectName" :class="$style.nowrap">
						{{ projectName }}
					</span>
					<span v-else>
						{{ i18n.baseText('projects.badge.global') }}
					</span>
				</PongBadge>
				<template #content>
					{{ badgeTooltip }}
				</template>
			</PongTooltip>
			<PongActionToggle
				:actions="actionDropdownOptions"
				data-test-id="secrets-provider-action-toggle"
				@action="onAction"
			/>
		</template>
	</PongCard>
</template>

<style lang="css" module>
.card {
	--card--padding: var(--spacing--2xs);
	padding-left: var(--spacing--sm);
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: var(--shadow--card-hover);
	}
}

.providerImage {
	width: 100%;
	height: 100%;
}

.headerContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.cardBadge {
	margin-right: var(--spacing--3xs);
}

.badge {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--color--background--light-3);
	border-color: var(--color--foreground);
	height: var(--spacing--lg);
	cursor: pointer;

	& > span {
		display: flex;
		gap: var(--spacing--3xs);
		align-items: center;
	}
}

.nowrap {
	white-space: nowrap !important;
}
</style>
