<script setup lang="ts">
import { PongText } from '@pong/design-system';

const { name, isError, isDeleted } = defineProps<{
	name: string;
	isError?: boolean;
	isDeleted?: boolean;
}>();
</script>

<template>
	<PongText
		tag="div"
		:bold="true"
		size="small"
		:class="$style.name"
		:color="isError ? 'danger' : undefined"
	>
		<del v-if="isDeleted" data-test-id="logs-node-name-deleted">
			{{ name }}
		</del>
		<template v-else>
			{{ name }}
		</template>
	</PongText>
</template>

<style lang="scss" module>
.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	& del:not(:last-child) {
		margin-right: var(--spacing--4xs);
	}
}
</style>
