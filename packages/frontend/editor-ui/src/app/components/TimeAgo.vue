<script lang="ts" setup>
import { PongTimeAgo } from '@pong/design-system';
import { useRootStore } from '@pong/stores/useRootStore';

type Props = {
	date: string;
	capitalize?: boolean;
	live?: boolean;
};

withDefaults(defineProps<Props>(), {
	capitalize: false,
	live: false,
});

const rootStore = useRootStore();
</script>

<template>
	<PongTimeAgo
		:date="date"
		:capitalize="capitalize"
		:locale="rootStore.defaultLocale"
		:live="live"
	/>
</template>
