<script setup lang="ts">
import { ref } from 'vue';
import { useTimeoutFn } from '@vueuse/core';
import { PongSpinner, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { TIME } from '@/app/constants/durations';

const i18n = useI18n();
const isVisible = ref(false);

// Mount only during loading. Unmounting cancels the delay for fast requests.
useTimeoutFn(() => {
	isVisible.value = true;
}, TIME.SECOND);
</script>

<template>
	<div v-if="isVisible" :class="$style.indicator" role="status" data-test-id="data-table-loading">
		<PongSpinner size="small" />
		<PongText size="small">{{ i18n.baseText('generic.loadingEllipsis') }}</PongText>
	</div>
</template>

<style module lang="scss">
.indicator {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	// Keep the indicator above AG Grid's loading overlay.
	z-index: 3;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--background--surface);
	pointer-events: none;
}
</style>
