<script setup lang="ts">
const props = defineProps<{
	params: {
		value: string;
	};
}>();
</script>

<template>
	<span class="pong-empty-value">{{ props.params.value }}</span>
</template>

<style lang="scss">
.pong-empty-value {
	font-style: italic;
	color: var(--color--text);
}
</style>
