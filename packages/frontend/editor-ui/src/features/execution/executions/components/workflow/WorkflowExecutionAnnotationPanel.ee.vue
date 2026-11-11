<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ExecutionSummary } from 'pong-workflow';
import { useI18n } from '@pong/i18n';
import { getResourcePermissions } from '@pong/permissions';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';

import {
	PongBadge,
	PongButton,
	PongDropdownMenu,
	PongHeading,
	PongText,
	type DropdownMenuExposed,
} from '@pong/design-system';
const props = defineProps<{
	execution: ExecutionSummary & {
		customData?: Record<string, string>;
	};
}>();

const workflowsListStore = useWorkflowsListStore();
const i18n = useI18n();

const annotationDropdownRef = ref<DropdownMenuExposed | null>(null);
const isDropdownVisible = ref(false);

const workflowId = useInjectWorkflowId();
const workflowPermissions = computed(
	() =>
		getResourcePermissions(workflowsListStore.getWorkflowById(workflowId.value)?.scopes).workflow,
);

const customDataLength = computed(() => {
	return props.execution?.customData ? Object.keys(props.execution?.customData).length : 0;
});

function onEllipsisButtonBlur(event: FocusEvent) {
	// Hide dropdown when clicking outside of current document
	if (annotationDropdownRef.value && event.relatedTarget === null) {
		annotationDropdownRef.value.close();
	}
}
</script>

<template>
	<PongDropdownMenu
		v-if="execution"
		ref="annotationDropdownRef"
		v-model="isDropdownVisible"
		:items="[]"
		placement="bottom-end"
		width="250px"
		:extra-popper-class="$style.menu"
	>
		<template #trigger>
			<PongButton
				variant="outline"
				:title="i18n.baseText('executionDetails.additionalActions')"
				:disabled="!workflowPermissions.update"
				icon="list-checks"
				:icon-only="customDataLength === 0"
				:class="{
					[$style.highlightDataButtonOpen]: isDropdownVisible,
				}"
				size="small"
				data-test-id="execution-preview-ellipsis-button"
				@blur="onEllipsisButtonBlur"
			>
				<PongBadge v-if="customDataLength > 0" :class="$style.badge" variant="primary">
					{{ customDataLength.toString() }}
				</PongBadge>
			</PongButton>
		</template>
		<template #content>
			<div
				ref="container"
				:class="['execution-annotation-panel', $style.container]"
				data-test-id="execution-annotation-panel"
			>
				<div :class="$style.section">
					<div :class="$style.heading">
						<PongHeading tag="h3" size="small" color="text-dark">
							{{ i18n.baseText('generic.annotationData') }}
						</PongHeading>
					</div>
					<div
						v-if="execution?.customData && Object.keys(execution?.customData).length > 0"
						:class="$style.metadata"
					>
						<div
							v-for="attr in Object.keys(execution?.customData)"
							:key="attr"
							:class="$style.customDataEntry"
						>
							<PongText :class="$style.key" size="small" color="text-base">
								{{ attr }}
							</PongText>
							<PongText :class="$style.value" size="small" color="text-base">
								{{ execution?.customData[attr] }}
							</PongText>
						</div>
					</div>
					<div
						v-else
						:class="$style.noResultsContainer"
						data-test-id="execution-annotation-data-empty"
					>
						<PongText color="text-base" size="small" align="center">
							<span v-pong-html="i18n.baseText('executionAnnotationView.data.notFound')" />
						</PongText>
					</div>
				</div>
			</div>
		</template>
	</PongDropdownMenu>
</template>

<style module lang="scss">
.highlightDataButtonOpen {
	color: var(--color--primary);
	background-color: var(--button--color--background--secondary--hover);
	border-color: var(--button--border-color--secondary--hover-active-focus);
}

.badge {
	border: 0;
}

.menu {
	width: var(--pong--dropdown-menu-width);
	min-width: var(--pong--dropdown-menu-width);
}

.container {
	z-index: 1;
	max-height: calc(100vh - 250px);
	width: 100%;

	display: flex;
	flex-direction: column;
	overflow: auto;
}

.section {
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;

	&:not(:last-child) {
		border-bottom: var(--border);
	}
}

.metadata {
	padding-top: var(--spacing--sm);
}

.heading {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	padding-right: var(--spacing--lg);
}

.controls {
	padding: var(--spacing--sm) 0 var(--spacing--xs);
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing--md);

	button {
		display: flex;
		align-items: center;
	}
}

.customDataEntry {
	display: flex;
	flex-direction: column;

	&:not(:first-of-type) {
		margin-top: var(--spacing--sm);
	}

	.key {
		font-weight: var(--font-weight--medium);
	}
}

.noResultsContainer {
	width: 100%;
	margin-top: var(--spacing--sm);
}

.execution-annotation-panel {
	:deep(.el-skeleton__item) {
		height: 60px;
		border-radius: 0;
	}
}
</style>
