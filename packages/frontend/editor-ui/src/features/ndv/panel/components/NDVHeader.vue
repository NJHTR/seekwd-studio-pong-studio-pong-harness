<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { getNodeIconSize, type NodeIconSource } from '@/app/utils/nodeIcon';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

import {
	PongIcon,
	PongIconButton,
	PongInlineTextEdit,
	PongLink,
	PongText,
	PongTooltip,
} from '@pong/design-system';
const props = defineProps<{
	nodeName: string;
	nodeTypeName: string;
	docsUrl?: string;
	icon?: NodeIconSource;
	readOnly?: boolean;
}>();

const i18n = useI18n();

const emit = defineEmits<{ close: []; rename: [name: string] }>();

const iconSize = computed(() => {
	const iconName = props.icon?.type === 'icon' ? props.icon.name : undefined;
	return getNodeIconSize('ndvHeader', iconName);
});

function onRename(newNodeName: string) {
	emit('rename', newNodeName || props.nodeTypeName);
}
</script>

<template>
	<header :class="$style.ndvHeader">
		<div :class="$style.content">
			<NodeIcon
				v-if="icon"
				:class="$style.icon"
				:size="iconSize"
				:icon-source="icon"
				:node-name="props.nodeTypeName"
				:show-tooltip="true"
			/>
			<div :class="$style.title" data-test-id="node-title-container">
				<PongInlineTextEdit
					:model-value="nodeName"
					:min-width="0"
					:max-width="500"
					:placeholder="i18n.baseText('ndv.title.rename.placeholder')"
					:read-only="readOnly"
					@update:model-value="onRename"
				/>
			</div>
		</div>

		<div :class="$style.actions">
			<PongLink v-if="docsUrl" theme="text" target="_blank" :href="docsUrl">
				<span :class="$style.docsLabel">
					<PongText size="small" bold>
						{{ i18n.baseText('nodeSettings.docs') }}
					</PongText>
					<PongIcon icon="external-link" />
				</span>
			</PongLink>
			<PongTooltip>
				<template #content>
					{{ i18n.baseText('ndv.close.tooltip') }}
				</template>
				<PongIconButton
					variant="ghost"
					icon="x"
					data-test-id="ndv-close-button"
					@click="emit('close')"
				/>
			</PongTooltip>
		</div>
	</header>
</template>

<style lang="css" module>
.ndvHeader {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs);
	background: var(--color--background--light-3);
}

.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-left: var(--spacing--2xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.actions button:hover {
	background-color: var(--color--background);
}

.actions > *:not(:last-child) {
	border-right: var(--border);
	padding-right: var(--spacing--2xs);
}

.title {
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
}

.docsLabel {
	display: flex;
	gap: var(--spacing--4xs);
}

.icon {
	align-self: center;
	z-index: 1;
}
</style>
