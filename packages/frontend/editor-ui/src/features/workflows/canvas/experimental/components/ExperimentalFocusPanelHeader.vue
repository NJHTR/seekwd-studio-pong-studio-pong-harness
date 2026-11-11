<script lang="ts" setup>
import NodeExecuteButton from '@/app/components/NodeExecuteButton.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { type INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n } from '@pong/i18n';
import { type INodeProperties } from 'pong-workflow';
import { computed } from 'vue';

import { PongIconButton, PongInlineTextEdit, PongText } from '@pong/design-system';
const { node, parameter, isExecutable } = defineProps<{
	node: INodeUi;
	parameter?: INodeProperties;
	isExecutable: boolean;
	readOnly: boolean;
}>();

const emit = defineEmits<{
	execute: [];
	openNdv: [];
	clearParameter: [];
	renameNode: [newName: string];
}>();

const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();
const nodeType = computed(() => nodeTypesStore.getNodeType(node.type, node.typeVersion));
</script>

<template>
	<PongText tag="header" size="small" bold :class="$style.component">
		<NodeIcon :node-type="nodeType" :size="16" />
		<div :class="$style.breadcrumbs">
			<template v-if="parameter">
				<PongText size="small" color="text-base" bold>
					{{ node.name }}
				</PongText>
				<PongText size="small" color="text-light">/</PongText>
				{{ parameter.displayName }}
			</template>
			<PongInlineTextEdit
				v-else
				:model-value="node.name"
				:min-width="0"
				:max-width="500"
				:placeholder="i18n.baseText('ndv.title.rename.placeholder')"
				:read-only="readOnly"
				@update:model-value="emit('renameNode', $event)"
			/>
		</div>
		<PongIconButton
			variant="ghost"
			v-if="parameter"
			icon="x"
			size="small"
			@click="emit('clearParameter')"
		/>
		<PongIconButton variant="ghost" v-else icon="expand" size="small" @click="emit('openNdv')" />
		<NodeExecuteButton
			v-if="isExecutable"
			data-test-id="node-execute-button"
			:node-name="node.name"
			:tooltip="`Execute ${node.name}`"
			variant="outline"
			size="small"
			icon="play"
			:square="true"
			:hide-label="true"
			telemetry-source="focus"
			@execute="emit('execute')"
		/>
	</PongText>
</template>

<style lang="scss" module>
.component {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs);
	gap: var(--spacing--2xs);
	border-bottom: var(--border);
}

.breadcrumbs {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-grow: 1;
	flex-shrink: 1;
}
</style>
