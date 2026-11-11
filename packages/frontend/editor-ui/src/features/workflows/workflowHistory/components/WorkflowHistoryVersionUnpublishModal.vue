<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { DependencyType, ResolvedDependency } from '@pong/api-types';
import { useI18n } from '@pong/i18n';
import type { BaseTextKey } from '@pong/i18n';
import Modal from '@/app/components/Modal.vue';
import { useDependencies } from '@/app/composables/useDependencies';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';
import type { EventBus } from '@pong/utils/event-bus';

import { PongButton, PongHeading, PongIcon, PongLink, PongText } from '@pong/design-system';

export type WorkflowHistoryVersionUnpublishModalEventBusEvents = {
	unpublish: undefined;
	cancel: undefined;
};

/** Dependents that run the published version, so they break when it goes away. */
const AFFECTED_TYPES: Array<{ type: DependencyType; labelKey: BaseTextKey }> = [
	{ type: 'workflowParent', labelKey: 'workflows.dependencies.type.parentWorkflows' },
	{ type: 'errorWorkflowParent', labelKey: 'workflows.dependencies.type.errorWorkflowParent' },
	{ type: 'agentUsage', labelKey: 'workflows.dependencies.type.agents' },
];

const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
		versionName?: string;
		eventBus: EventBus<WorkflowHistoryVersionUnpublishModalEventBusEvents>;
	};
}>();

const i18n = useI18n();
const router = useRouter();
const uiStore = useUIStore();
const { fetchDependencies, fetchDependencyCounts, getDependencies, getDependencyCounts } =
	useDependencies();
const unpublishing = ref(false);

onMounted(async () => {
	await Promise.all([
		fetchDependencies([props.data.workflowId], 'workflow'),
		fetchDependencyCounts([props.data.workflowId], 'workflow'),
	]);
});

const hrefFor = (dep: ResolvedDependency): string | undefined => {
	if (dep.type === 'agentUsage') {
		if (!dep.projectId) return undefined;
		return router.resolve({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: dep.projectId, agentId: dep.id },
		}).href;
	}
	return router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: dep.id } }).href;
};

const affectedGroups = computed(() => {
	const dependencies = getDependencies(props.data.workflowId, 'workflow')?.dependencies ?? [];
	return AFFECTED_TYPES.map((group) => ({
		...group,
		items: dependencies
			.filter((dep) => dep.type === group.type)
			.map((dep) => ({ ...dep, href: hrefFor(dep) })),
	})).filter((group) => group.items.length > 0);
});

// The counts include dependents the user cannot see; the details list does not.
const hiddenAffectedCount = computed(() => {
	const counts = getDependencyCounts(props.data.workflowId, 'workflow');
	if (!counts) return 0;
	const total = AFFECTED_TYPES.reduce((sum, { type }) => sum + counts[type], 0);
	const visible = affectedGroups.value.reduce((sum, group) => sum + group.items.length, 0);
	return total - visible;
});

const hasAffected = computed(
	() => affectedGroups.value.length > 0 || hiddenAffectedCount.value > 0,
);

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const onCancel = () => {
	props.data.eventBus.emit('cancel');
	closeModal();
};

const onUnpublish = () => {
	unpublishing.value = true;
	props.data.eventBus.emit('unpublish');
	// Modal will be closed by parent after API call completes
};

onBeforeUnmount(() => {
	unpublishing.value = false;
});
</script>

<template>
	<Modal width="500px" max-height="85vh" :name="props.modalName" :before-close="onCancel">
		<template #header>
			<PongHeading tag="h2" size="xlarge">
				{{
					i18n.baseText('workflowHistory.action.unpublish.modal.title', {
						interpolate: { versionName: props.data.versionName || '' },
					})
				}}
			</PongHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<PongIcon :class="$style.icon" icon="triangle-alert" color="warning" size="xlarge" />
				<div :class="$style.body">
					<PongText size="medium">
						{{
							i18n.baseText('workflowHistory.action.unpublish.modal.description', {
								interpolate: { versionName: props.data.versionName || '' },
							})
						}}
					</PongText>
					<template v-if="hasAffected">
						<PongText size="medium">
							{{ i18n.baseText('workflowHistory.action.unpublish.modal.affected') }}
						</PongText>
						<div :class="$style.affected" data-test-id="workflow-unpublish-affected-resources">
							<div v-for="group in affectedGroups" :key="group.type">
								<PongText size="small" color="text-light" bold>
									{{ i18n.baseText(group.labelKey) }}
								</PongText>
								<ul :class="$style.list">
									<li v-for="dep in group.items" :key="dep.id">
										<PongLink v-if="dep.href" :to="dep.href" new-window size="medium">
											{{ dep.name }}
										</PongLink>
										<PongText v-else size="medium">{{ dep.name }}</PongText>
									</li>
								</ul>
							</div>
							<PongText v-if="hiddenAffectedCount > 0" size="small" color="text-light">
								{{
									i18n.baseText('workflows.dependencies.hiddenNotice', {
										adjustToNumber: hiddenAffectedCount,
										interpolate: { count: String(hiddenAffectedCount) },
									})
								}}
							</PongText>
						</div>
					</template>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<PongButton variant="outline" size="medium" :disabled="unpublishing" @click="onCancel">
					{{ i18n.baseText('generic.cancel') }}
				</PongButton>
				<PongButton variant="solid" size="medium" :loading="unpublishing" @click="onUnpublish">
					{{ i18n.baseText('workflowHistory.action.unpublish.modal.button.unpublish') }}
				</PongButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;

	button {
		margin-left: var(--spacing--2xs);
	}
}

.content {
	display: flex;
	flex-direction: row;
	align-items: start;
	gap: var(--spacing--xs);
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--4xs);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
}

.affected {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.list {
	margin: 0;
	padding-left: var(--spacing--md);
	list-style: disc;
}
</style>
