<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import type { UserAction } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import type {
	WorkflowHistory,
	WorkflowVersionId,
	WorkflowHistoryRequestParams,
} from '@pong/rest-api-client/api/workflowHistory';
import WorkflowHistoryListItem from './WorkflowHistoryListItem.vue';
import WorkflowHistoryUpgradeFooter from './WorkflowHistoryUpgradeFooter.vue';
import type { IUser } from 'pong-workflow';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import { PongLoading, PongIcon, PongText } from '@pong/design-system';
import type { WorkflowHistoryAction } from '@/features/workflows/workflowHistory/types';
import {
	computeTimelineEntries,
	getVersionLabel,
	type TimelineEntry,
} from '@/features/workflows/workflowHistory/utils';

const props = defineProps<{
	items: WorkflowHistory[];
	selectedItem?: WorkflowHistory | null;
	actions: Array<UserAction<IUser>>;
	requestNumberOfItems: number;
	lastReceivedItemsLength: number;
	evaluatedPruneTimeInHours: number;
	shouldUpgrade?: boolean;
	isListLoading?: boolean;
	publishedVersionId?: string;
	isWorkflowDiffsEnabled?: boolean;
}>();

const emit = defineEmits<{
	action: [value: WorkflowHistoryAction];
	preview: [value: { event: MouseEvent; id: WorkflowVersionId }];
	loadMore: [value: WorkflowHistoryRequestParams];
	upgrade: [];
	compare: [value: { id: WorkflowVersionId }];
}>();

const i18n = useI18n();
const listElement = ref<Element | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);
const shouldAutoScroll = ref(true);
const expandedGroups = reactive<Set<string>>(new Set());

const timelineEntries = computed<TimelineEntry[]>(() => {
	return computeTimelineEntries(props.items);
});

const toggleGroup = (groupId: string) => {
	if (expandedGroups.has(groupId)) {
		expandedGroups.delete(groupId);
	} else {
		expandedGroups.add(groupId);
	}
};

const hasMoreItems = computed(() => props.lastReceivedItemsLength === props.requestNumberOfItems);

const { observe: observeForLoadMore } = useIntersectionObserver({
	root: listElement,
	threshold: 0.01,
	onIntersect: () => {
		shouldAutoScroll.value = false;
		emit('loadMore', { take: props.requestNumberOfItems, skip: props.items.length });
	},
});

watch(
	[loadMoreSentinel, hasMoreItems, () => props.items.length],
	([sentinel, canLoadMore]) => {
		if (sentinel && canLoadMore) {
			observeForLoadMore(sentinel);
		}
	},
	{ immediate: true },
);

const getActions = (item: WorkflowHistory, index: number) => {
	let filteredActions = props.actions;

	if (index === 0) {
		filteredActions = filteredActions.filter((action) => action.value !== 'restore');
	}

	if (item.versionId === props.publishedVersionId) {
		filteredActions = filteredActions.filter((action) => action.value !== 'publish');
	} else {
		filteredActions = filteredActions.filter((action) => action.value !== 'unpublish');
	}

	return filteredActions;
};

const onAction = ({ action, id, data }: WorkflowHistoryAction) => {
	shouldAutoScroll.value = false;
	emit('action', { action, id, data });
};

const onPreview = ({ event, id }: { event: MouseEvent; id: WorkflowVersionId }) => {
	shouldAutoScroll.value = false;
	emit('preview', { event, id });
};

const onCompare = ({ id }: { id: WorkflowVersionId }) => {
	shouldAutoScroll.value = false;
	emit('compare', { id });
};

const getHistoryVersionLabel = (workflowHistory: WorkflowHistory): string => {
	const currentVersionId = props.items[0]?.versionId;

	return getVersionLabel({ workflowHistory, currentVersionId });
};

const getItemToCompareWith = (
	item: WorkflowHistory,
	index: number,
): { name: string; versionId: WorkflowVersionId } | null => {
	if (!props.isWorkflowDiffsEnabled) {
		return null;
	}

	if (!props.selectedItem) {
		return null;
	}

	const isSelected = props.items[index]?.versionId === props.selectedItem?.versionId;

	if (isSelected) {
		const previousVersion = props.items[index + 1];
		if (!previousVersion) {
			return null;
		}

		return {
			name: getHistoryVersionLabel(previousVersion),
			versionId: previousVersion.versionId,
		};
	}

	return {
		name: getHistoryVersionLabel(props.selectedItem),
		versionId: item.versionId,
	};
};

const onItemMounted = ({
	offsetTop,
	isSelected,
}: {
	index: number;
	offsetTop: number;
	isSelected: boolean;
}) => {
	if (isSelected && shouldAutoScroll.value) {
		shouldAutoScroll.value = false;
		listElement.value?.scrollTo({ top: offsetTop, behavior: 'smooth' });
	}
};

const pruneTimeDisplay = computed(() => {
	const timeInHours = props.evaluatedPruneTimeInHours;

	if (timeInHours < 24) {
		const key = timeInHours === 1 ? 'workflowHistory.limitHour' : 'workflowHistory.limitHours';
		return i18n.baseText(key, {
			interpolate: { hours: String(timeInHours) },
		});
	} else {
		const days = Math.round(timeInHours / 24);
		const key = days === 1 ? 'workflowHistory.limitDay' : 'workflowHistory.limitDays';
		return i18n.baseText(key, { interpolate: { days: String(days) } });
	}
});
</script>

<template>
	<ul ref="listElement" :class="$style.list" data-test-id="workflow-history-list">
		<template
			v-for="entry in timelineEntries"
			:key="entry.type === 'version' ? entry.item.versionId : entry.groupId"
		>
			<!-- Group header for collapsed unnamed versions -->
			<li
				v-if="entry.type === 'group-header'"
				:class="$style.groupHeader"
				:aria-expanded="expandedGroups.has(entry.groupId)"
				role="button"
				data-test-id="workflow-history-group-header"
				@click="toggleGroup(entry.groupId)"
			>
				<PongIcon
					:class="[$style.groupTimelineColumn, $style.groupChevron]"
					:icon="expandedGroups.has(entry.groupId) ? 'chevron-down' : 'chevron-right'"
					size="small"
				/>
				<PongText color="text-base" size="small">
					{{
						i18n.baseText('workflowHistory.group.unnamedVersions', {
							adjustToNumber: entry.count,
							interpolate: { count: String(entry.count) },
						})
					}}
				</PongText>
			</li>

			<!-- Expanded group versions -->
			<template v-if="entry.type === 'group-header' && expandedGroups.has(entry.groupId)">
				<WorkflowHistoryListItem
					v-for="versionEntry in entry.versions"
					:key="versionEntry.item.versionId"
					:index="versionEntry.originalIndex"
					:item="versionEntry.item"
					:compare-with="getItemToCompareWith(versionEntry.item, versionEntry.originalIndex)"
					:is-selected="versionEntry.item.versionId === props.selectedItem?.versionId"
					:is-published="versionEntry.item.versionId === props.publishedVersionId"
					:actions="getActions(versionEntry.item, versionEntry.originalIndex)"
					:is-workflow-diffs-enabled="props.isWorkflowDiffsEnabled"
					:is-grouped="true"
					@action="onAction"
					@preview="onPreview"
					@compare="onCompare"
					@mounted="onItemMounted"
				/>
			</template>

			<!-- Regular version entry -->
			<WorkflowHistoryListItem
				v-if="entry.type === 'version'"
				:index="entry.originalIndex"
				:item="entry.item"
				:compare-with="getItemToCompareWith(entry.item, entry.originalIndex)"
				:is-selected="entry.item.versionId === props.selectedItem?.versionId"
				:is-published="entry.item.versionId === props.publishedVersionId"
				:actions="getActions(entry.item, entry.originalIndex)"
				:is-workflow-diffs-enabled="props.isWorkflowDiffsEnabled"
				@action="onAction"
				@preview="onPreview"
				@compare="onCompare"
				@mounted="onItemMounted"
			/>
		</template>
		<li
			v-if="props.items.length && hasMoreItems"
			ref="loadMoreSentinel"
			:class="$style.sentinel"
			aria-hidden="true"
		/>
		<li
			v-if="props.isListLoading"
			:class="$style.loader"
			role="status"
			aria-live="polite"
			aria-busy="true"
			:aria-label="i18n.baseText('generic.loading')"
		>
			<PongLoading :rows="3" class="mb-xs" />
			<PongLoading :rows="3" class="mb-xs" />
			<PongLoading :rows="3" class="mb-xs" />
		</li>
		<li v-if="props.shouldUpgrade">
			<WorkflowHistoryUpgradeFooter
				:prune-time-display="pruneTimeDisplay"
				@upgrade="emit('upgrade')"
			/>
		</li>
	</ul>
</template>

<style module lang="scss">
@use './timeline' as *;

.list {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: auto;
	padding: var(--spacing--sm) var(--spacing--2xs);
}

.loader {
	padding: 0 var(--spacing--sm);
}

.sentinel {
	height: 1px;
}

.groupHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--3xs);
	margin-top: var(--spacing--lg);
	cursor: pointer;
	position: relative;

	// Line segment in the gap above this item (not for first item)
	&:not(:first-child)::before {
		@include timeline-gap-line;
	}
}

.groupTimelineColumn {
	min-width: var(--spacing--lg);
}

.groupChevron {
	color: var(--color--text--tint-1);
}
</style>
