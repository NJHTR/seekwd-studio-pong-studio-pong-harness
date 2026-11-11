<script setup lang="ts">
import { PongText } from '@pong/design-system';
</script>

<template>
	<div :class="$style.NoIssuesContainer">
		<PongText tag="h3" size="large" color="text-base" class="mb-2xs">
			<slot name="title" />
		</PongText>
		<PongText tag="p" size="medium" color="text-light" class="mb-2xl">
			<slot name="description" />
		</PongText>
	</div>
</template>

<style module>
.NoIssuesContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: var(--spacing--4xl) 0;
}
</style>
