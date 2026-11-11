<script setup lang="ts">
import type { AppResponse, AppVersionResponse } from '@pong/api-types';
import {
	PongActionDropdown,
	PongBadge,
	PongButton,
	PongIconButton,
	PongLoading,
	PongText,
	PongTimeAgo,
	PongTooltip,
	type ActionDropdownItem,
} from '@pong/design-system';
import { useToast } from '@pong/composables/useToast';
import { useI18n } from '@pong/i18n';
import { ResponseError } from '@pong/rest-api-client';
import { useRootStore } from '@pong/stores/useRootStore';
import { computed, ref } from 'vue';

import { restoreAppVersion } from '../../apps.api';
import { getAppPermissions } from '../../apps.permissions';
import {
	getAppVersionLabel,
	isBuilding,
	isBuilt,
	type AppVersions,
} from '../../composables/useAppVersions';
import AppPublishDialog from '../publish/AppPublishDialog.vue';

const props = defineProps<{ app: AppResponse; versions: AppVersions }>();

const emit = defineEmits<{ updated: [app: AppResponse]; restored: []; close: [] }>();

type VersionAction = 'publish' | 'restore';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const { versions: list, loading, failed } = props.versions;

const canUpdate = computed(() => getAppPermissions(props.app.projectId).canUpdate);
const selected = ref<AppVersionResponse | null>(null);
const publishOpen = ref(false);
const restoring = ref(false);

function isDraft(version: AppVersionResponse) {
	return version.id === props.app.draftVersionId;
}

function publishDisabledReason(version: AppVersionResponse) {
	if (!canUpdate.value) return i18n.baseText('apps.versions.noPermission');
	if (isBuilt(version)) return undefined;
	return i18n.baseText(
		isDraft(version) ? 'apps.versions.notBuilt' : 'apps.versions.notBuiltRestore',
	);
}

function actions(version: AppVersionResponse) {
	const items: Array<ActionDropdownItem<VersionAction>> = [];
	if (version.id !== props.app.publishedVersionId) {
		const reason = publishDisabledReason(version);
		items.push({
			id: 'publish',
			label: i18n.baseText('apps.versions.publish'),
			disabled: reason !== undefined,
			description: reason,
		});
	}
	if (!isDraft(version)) {
		items.push({
			id: 'restore',
			label: i18n.baseText('apps.versions.restore'),
			disabled: !canUpdate.value || restoring.value,
			description: canUpdate.value ? undefined : i18n.baseText('apps.versions.noPermission'),
		});
	}
	return items;
}

async function restore(version: AppVersionResponse) {
	restoring.value = true;
	try {
		await restoreAppVersion(
			rootStore.restApiContext,
			props.app.projectId,
			props.app.id,
			version.id,
			{
				baseVersionId: props.app.draftVersionId,
			},
		);
		emit('restored');
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.versions.restoreError'));
		// A changed draft makes the restore fail, so reload to show the current draft.
		if (error instanceof ResponseError && error.httpStatusCode === 409) emit('restored');
	} finally {
		restoring.value = false;
	}
}

async function onSelect(action: VersionAction, version: AppVersionResponse) {
	if (!actions(version).some((item) => item.id === action && !item.disabled)) return;
	if (action === 'restore') {
		await restore(version);
		return;
	}
	selected.value = version;
	publishOpen.value = true;
}
</script>

<template>
	<aside :class="$style.panel" data-test-id="app-versions-panel">
		<header :class="$style.header">
			<PongText bold color="text-dark">{{ i18n.baseText('apps.versions.title') }}</PongText>
			<PongIconButton
				icon="x"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('generic.close')"
				data-test-id="app-versions-close"
				@click="emit('close')"
			/>
		</header>
		<div :class="$style.body">
			<PongLoading
				v-if="loading && !list.length"
				:loading="true"
				:rows="3"
				data-test-id="app-versions-loading"
			/>
			<div
				v-else-if="failed && !list.length"
				:class="$style.error"
				data-test-id="app-versions-error"
			>
				<PongText size="small" color="text-light">
					{{ i18n.baseText('apps.versions.loadError') }}
				</PongText>
				<PongButton
					variant="outline"
					size="small"
					:label="i18n.baseText('generic.retry')"
					data-test-id="app-versions-retry"
					@click="versions.refresh()"
				/>
			</div>
			<PongText
				v-else-if="!list.length"
				size="small"
				color="text-light"
				data-test-id="app-versions-empty"
			>
				{{ i18n.baseText('apps.versions.empty') }}
			</PongText>
			<div
				v-for="(version, index) in list"
				v-else
				:key="version.id"
				:class="[$style.row, { [$style.current]: index === 0 }]"
				data-test-id="app-version-row"
			>
				<div :class="$style.text">
					<PongText color="text-dark">{{ getAppVersionLabel(version) }}</PongText>
					<PongText size="small" color="text-light">
						<PongTimeAgo :date="version.createdAt" :locale="rootStore.defaultLocale" />
					</PongText>
					<PongBadge
						v-if="version.id === app.publishedVersionId"
						:class="$style.badge"
						variant="success"
						data-test-id="app-version-published"
					>
						{{ i18n.baseText('apps.publish.published') }}
					</PongBadge>
					<PongBadge
						v-else-if="isBuilding(version.buildStatus)"
						:class="$style.badge"
						variant="info"
						data-test-id="app-version-status"
					>
						{{ i18n.baseText('apps.preview.building') }}
					</PongBadge>
					<PongBadge
						v-else-if="version.buildStatus === 'failed'"
						:class="$style.badge"
						variant="danger"
						data-test-id="app-version-status"
					>
						{{ i18n.baseText('apps.preview.buildFailed') }}
					</PongBadge>
				</div>
				<PongActionDropdown
					v-if="actions(version).length"
					:items="actions(version)"
					placement="bottom-end"
					data-test-id="app-version-actions"
					@select="onSelect($event, version)"
				>
					<template #menuItem="item">
						<PongTooltip :content="item.description" :disabled="!item.description" placement="left">
							<span>{{ item.label }}</span>
						</PongTooltip>
					</template>
					<template #activator>
						<PongIconButton
							icon="ellipsis"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('apps.versions.actions')"
						/>
					</template>
				</PongActionDropdown>
			</div>
		</div>
		<AppPublishDialog
			v-if="selected"
			v-model:open="publishOpen"
			:app="app"
			:version="selected"
			@updated="emit('updated', $event)"
		/>
	</aside>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	inset-block: 0;
	inset-inline-end: 0;
	z-index: 1;
	display: flex;
	flex-direction: column;
	width: 20rem;
	max-width: 100%;
	background-color: var(--background--surface);
	border-left: var(--border);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	overflow-y: auto;
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border-radius: var(--radius--lg);
}

.current {
	background-color: var(--background--subtle);
}

.text {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
}

.error {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.badge {
	align-self: flex-start;
	margin-top: var(--spacing--4xs);
}
</style>
