<script setup lang="ts">
import { PongDropdownMenuItem } from '@pong/design-system';
import type { VersionNode } from '@pong/rest-api-client/api/versions';
import type { NodeDiffStatus } from 'pong-workflow';
import { useId } from 'vue';

import type { SimplifiedNodeType } from '@/Interface';
import NodeIcon from '@/app/components/NodeIcon.vue';
import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';

defineProps<{
	nodeType?: SimplifiedNodeType | VersionNode | null;
	nodeName?: string;
	isActive?: boolean;
	isCompact?: boolean;
	badgeType?: NodeDiffStatus;
}>();

const emit = defineEmits<{
	select: [];
}>();

const itemId = useId();
</script>

<template>
	<PongDropdownMenuItem
		:id="itemId"
		:label="nodeName ?? ''"
		:close-on-select="false"
		:class="{
			[$style.active]: isActive === true,
			[$style.compact]: isCompact === true,
		}"
		@select="emit('select')"
	>
		<template #item-leading="{ ui }">
			<DiffBadge v-if="badgeType !== undefined" :type="badgeType" :class="ui.class" />
			<NodeIcon :node-type="nodeType" :size="16" :class="ui.class" />
		</template>
	</PongDropdownMenuItem>
</template>

<style module lang="scss">
.active {
	background-color: var(--background--hover);
}

.compact {
	min-height: 0;
	padding: var(--spacing--5xs) 0;
}
</style>
