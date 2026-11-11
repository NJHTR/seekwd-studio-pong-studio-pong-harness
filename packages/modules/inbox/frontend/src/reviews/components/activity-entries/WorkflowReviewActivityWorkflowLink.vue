<script setup lang="ts">
import { PongIcon, PongLink } from '@pong/design-system';
import { computed } from 'vue';

import { VIEWS } from '@pong/frontend-constants/views';

const props = defineProps<{
	workflowId: string;
	workflowName: string;
	version?: string;
}>();

const label = computed(() =>
	props.version ? `${props.workflowName} ${props.version}` : props.workflowName,
);
</script>

<template>
	<PongLink
		:to="{ name: VIEWS.WORKFLOW, params: { workflowId } }"
		theme="text"
		size="medium"
		data-test-id="workflow-review-activity-workflow-link"
	>
		<PongIcon icon="workflow" size="medium" :class="$style.icon" />{{ label }}
	</PongLink>
</template>

<style lang="scss" module>
.icon {
	margin-left: var(--spacing--4xs);
	margin-right: var(--spacing--4xs);
	/* Inline with the sentence; the offset optically centres the icon on the text. */
	vertical-align: -0.15em;
}
</style>
