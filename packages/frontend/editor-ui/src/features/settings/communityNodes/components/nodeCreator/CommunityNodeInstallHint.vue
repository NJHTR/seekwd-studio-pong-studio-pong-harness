<script setup lang="ts">
import { useUsersStore } from '@pong/stores/users.store';
import { computed } from 'vue';

import { PongIcon, PongText } from '@pong/design-system';
export interface Props {
	hint: string;
}

const isAdminOrOwner = computed(() => useUsersStore().isAdminOrOwner);

defineProps<Props>();
</script>

<template>
	<div v-if="isAdminOrOwner" :class="$style.container">
		<PongIcon color="text-light" icon="info" size="large" />
		<PongText color="text-base" size="medium"> {{ hint }} </PongText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	margin: var(--spacing--sm);
	margin-top: 0;
	padding: var(--spacing--xs);
	border: var(--border-width) solid var(--color--foreground);
	border-radius: 0.25em;
	pointer-events: none;
	cursor: default;
}
</style>
