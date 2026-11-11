<script setup lang="ts">
import { computed } from 'vue';
import { useCanvasNode } from '../../../../../composables/useCanvasNode';
import { useI18n } from '@pong/i18n';

import { PongIcon, PongTooltip } from '@pong/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
const { name } = useCanvasNode();
const i18n = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();

const node = computed(() => workflowDocumentStore.value.getNodeByName(name.value));
const size = 'small';
</script>

<template>
	<div :class="$style.settingsIcons">
		<PongTooltip v-if="node?.alwaysOutputData">
			<template #content>
				<div :class="$style.tooltipHeader">
					<PongIcon icon="always-output-data" :size="size" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.alwaysOutputData.displayName')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.alwaysOutputData') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-always-output-data" :class="$style.icon">
				<PongIcon icon="always-output-data" :size="size" />
			</div>
		</PongTooltip>

		<PongTooltip v-if="node?.executeOnce">
			<template #content>
				<div :class="$style.tooltipHeader">
					<PongIcon icon="execute-once" :size="size" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.executeOnce.displayName')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.executeOnce') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-execute-once" :class="$style.icon">
				<PongIcon icon="execute-once" :size="size" />
			</div>
		</PongTooltip>

		<PongTooltip v-if="node?.retryOnFail">
			<template #content>
				<div :class="$style.tooltipHeader">
					<PongIcon icon="retry-on-fail" :size="size" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('nodeSettings.retryOnFail.displayName')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.retriesOnFailure') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-retry-on-fail" :class="$style.icon">
				<PongIcon icon="retry-on-fail" :size="size" />
			</div>
		</PongTooltip>

		<PongTooltip
			v-if="node?.onError === 'continueRegularOutput' || node?.onError === 'continueErrorOutput'"
		>
			<template #content>
				<div :class="$style.tooltipHeader">
					<PongIcon icon="continue-on-error" :size="size" />
					<strong :class="$style.tooltipTitle">{{
						i18n.baseText('node.settings.continuesOnError.title')
					}}</strong>
				</div>
				<div>
					{{ i18n.baseText('node.settings.continuesOnError') }}
				</div>
			</template>
			<div data-test-id="canvas-node-status-continue-on-error" :class="$style.icon">
				<PongIcon icon="continue-on-error" :size="size" />
			</div>
		</PongTooltip>
	</div>
</template>

<style lang="scss" module>
.settingsIcons {
	position: absolute;
	top: var(--canvas-node--status-icons--margin);
	right: var(--canvas-node--status-icons--margin);
	display: flex;
	flex-direction: row;
	gap: 1px;
}
.tooltipHeader {
	display: flex;
	gap: 2px;
}

.tooltipTitle {
	font-weight: var(--font-weight--medium);
	font-size: inherit;
	line-height: inherit;
}

.icon {
	width: var(--spacing--md);
	height: var(--spacing--md);
	display: grid;
	place-items: center;
}
</style>
