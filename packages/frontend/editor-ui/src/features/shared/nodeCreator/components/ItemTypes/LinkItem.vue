<script setup lang="ts">
import type { LinkItemProps } from '@/Interface';

import { PongNodeCreatorNode, PongNodeIcon } from '@pong/design-system';
export interface Props {
	link: LinkItemProps;
}

defineProps<Props>();
</script>

<template>
	<PongNodeCreatorNode
		:class="$style.creatorLink"
		:title="link.title"
		:is-trigger="false"
		:description="link.description"
		:tag="link.tag"
		:show-action-arrow="true"
	>
		<template #icon>
			<PongNodeIcon type="icon" :name="link.icon" :circle="false" :show-tooltip="false" />
		</template>
	</PongNodeCreatorNode>
</template>

<style lang="scss" module>
.creatorLink {
	--action--arrow--color: var(--color--text--tint-1);
	margin-left: var(--spacing--sm);
	margin-right: var(--spacing--xs);
}
</style>
