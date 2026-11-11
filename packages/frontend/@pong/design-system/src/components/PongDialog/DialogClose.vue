<script setup lang="ts">
import { DialogClose } from 'reka-ui';

import { useI18n } from '../../composables/useI18n';
import Icon from '../PongIcon/Icon.vue';

export interface DialogCloseProps {
	/**
	 * Merge props onto child element instead of rendering a button
	 */
	asChild?: boolean;
}

defineProps<DialogCloseProps>();

const { t } = useI18n();
</script>

<template>
	<DialogClose v-if="asChild" as-child>
		<slot />
	</DialogClose>
	<DialogClose
		v-else
		:class="$style['close-button']"
		:aria-label="t('dialog.close')"
		data-test-id="dialog-close-button"
	>
		<slot>
			<Icon icon="x" />
		</slot>
	</DialogClose>
</template>

<style module lang="scss">
@use '@pong/design-system/css/mixins/focus';

.close-button {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--pong-dialog-close--size, var(--spacing--lg));
	height: var(--pong-dialog-close--size, var(--spacing--lg));
	padding: 0;
	border: none;
	border-radius: var(--radius);
	background-color: transparent;
	color: var(--color--text);
	cursor: pointer;

	&:hover {
		background-color: var(--color--background);
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		@include focus.focus-ring;
		box-shadow: inset 0 0 0 var(--border-width, 1px) var(--focus--border-color);
	}
}
</style>
