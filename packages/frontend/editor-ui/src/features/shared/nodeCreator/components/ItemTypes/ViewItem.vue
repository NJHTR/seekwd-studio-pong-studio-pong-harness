<script setup lang="ts">
import type { ViewItemProps } from '@/Interface';

import { PongNodeCreatorNode, PongNodeIcon } from '@pong/design-system';
export interface Props {
	view: ViewItemProps;
	showActionArrow?: boolean;
}

withDefaults(defineProps<Props>(), {
	showActionArrow: true,
});
</script>

<template>
	<PongNodeCreatorNode
		:class="$style.view"
		:title="view.title"
		:tag="view.tag"
		:is-trigger="false"
		:description="view.description"
		:show-action-arrow="showActionArrow"
	>
		<template #icon>
			<PongNodeIcon type="icon" :name="view.icon" :circle="false" :show-tooltip="false" />
		</template>
	</PongNodeCreatorNode>
</template>

<style lang="scss" module>
.view {
	--action--arrow--color: var(--color--text--tint-1);
	--node--icon--color: var(--node-creator--icon--color);
	margin-left: var(--spacing--sm);
	margin-right: var(--spacing--xs);
}
</style>
