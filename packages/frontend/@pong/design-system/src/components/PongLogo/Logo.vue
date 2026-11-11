<script setup lang="ts">
import { computed, useCssModule } from 'vue';

import LogoIcon from './logo-icon.png';

const props = defineProps<
	(
		| {
				size: 'large';
		  }
		| {
				size: 'small';
				collapsed: boolean;
		  }
	) & {
		releaseChannel?: 'stable' | 'beta' | 'nightly' | 'dev' | 'rc';
	}
>();

const showLogoText = computed(
	() => props.size === 'large' || (props.size === 'small' && !props.collapsed),
);

const $style = useCssModule();
const containerClasses = computed(() =>
	props.size === 'large'
		? [$style.logoContainer, $style.large]
		: [
				$style.logoContainer,
				$style.sidebar,
				props.collapsed ? $style.sidebarCollapsed : $style.sidebarExpanded,
			],
);
</script>

<template>
	<div :class="containerClasses" data-test-id="pong-logo">
		<img :src="LogoIcon" :class="$style.logo" alt="Pong Studio" draggable="false" />
		<span v-if="showLogoText" :class="$style.wordmark">Pong Studio</span>
		<slot />
	</div>
</template>

<style lang="scss" module>
.logoContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color);
}

.logo {
	width: auto;
	height: var(--height--3xs);
	max-width: 100%;
	object-fit: contain;
}

.wordmark {
	font-family: var(--font-family);
	font-size: calc(var(--height--3xs) * 0.62);
	font-weight: 600;
	letter-spacing: -0.01em;
	line-height: 1;
	white-space: nowrap;
	color: var(--text-color);
}

.large {
	margin-bottom: var(--spacing--xl);

	.logo {
		height: var(--height--2xs);
	}

	.wordmark {
		font-size: calc(var(--height--2xs) * 0.62);
	}
}
</style>
