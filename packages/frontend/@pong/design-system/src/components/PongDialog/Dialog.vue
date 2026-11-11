<script setup lang="ts">
import { DialogRoot, DialogPortal } from 'reka-ui';

import PongDialogContent from './DialogContent.vue';
import PongDialogHeader from './DialogHeader.vue';
import PongDialogOverlay from './DialogOverlay.vue';
import PongDialogTitle from './DialogTitle.vue';

export type DialogSize =
	| 'small'
	| 'medium'
	| 'large'
	| 'xlarge'
	| '2xlarge'
	| 'fit'
	| 'full'
	| 'cover';

export interface DialogProps {
	/**
	 * Controlled open state of the dialog
	 */
	open?: boolean;
	/**
	 * The open state of the dialog when it is initially rendered.
	 * Use when you do not need to control its open state.
	 */
	defaultOpen?: boolean;
	/**
	 * Whether the dialog is modal (blocks interaction with the rest of the page)
	 * @default true
	 */
	modal?: boolean;
	/**
	 * Dialog width preset
	 * @default 'medium'
	 */
	size?: DialogSize;
	/**
	 * Force mount for animation control
	 */
	forceMount?: boolean;
	/**
	 * Trap focus within dialog
	 * @default true
	 */
	trapFocus?: boolean;
	/**
	 * Prevent clicks outside dialog
	 * @default true
	 */
	disableOutsidePointerEvents?: boolean;
	/**
	 * Close the dialog when the user clicks outside it.
	 * Escape and the close button still close the dialog.
	 * @default true
	 */
	closeOnOverlayClick?: boolean;
	/**
	 * Close the dialog when the user presses Escape.
	 * An overlay click and the close button still close the dialog.
	 * @default true
	 */
	closeOnEscape?: boolean;
	/**
	 * Show the close button on the title row. The button is the last stop in the tab order.
	 * @default true
	 */
	showCloseButton?: boolean;
	/**
	 * Accessible label for the dialog (used when DialogTitle is not provided)
	 */
	ariaLabel?: string;
	/**
	 * Accessible description for the dialog (used when DialogDescription is not provided)
	 */
	ariaDescription?: string;
	/**
	 * Shorthand for rendering a dialog header with a title.
	 * Alternative to using PongDialogHeader and PongDialogTitle as children.
	 */
	header?: string;
	/**
	 * Render above another open dialog
	 */
	stacked?: boolean;
	/**
	 * Custom class for the dialog container
	 */
	containerClass?: string;
}

export interface DialogEmits {
	escapeKeyDown: [event: KeyboardEvent];
	interactOutside: [event: Event];
	openAutoFocus: [event: Event];
	closeAutoFocus: [event: Event];
	'update:open': [value: boolean];
}

withDefaults(defineProps<DialogProps>(), {
	modal: true,
	size: 'medium',
	trapFocus: true,
	disableOutsidePointerEvents: true,
	closeOnOverlayClick: true,
	closeOnEscape: true,
	showCloseButton: true,
	stacked: false,
});
const emit = defineEmits<DialogEmits>();

defineOptions({ inheritAttrs: false });

const handleOpenChange = (value: boolean) => {
	emit('update:open', value);
};
</script>

<template>
	<DialogRoot
		:open="open"
		:default-open="defaultOpen"
		:modal="modal"
		@update:open="handleOpenChange"
	>
		<DialogPortal>
			<PongDialogOverlay :stacked="stacked" />
			<PongDialogContent
				v-bind="$attrs"
				:size="size"
				:force-mount="forceMount"
				:trap-focus="trapFocus"
				:disable-outside-pointer-events="disableOutsidePointerEvents"
				:close-on-overlay-click="closeOnOverlayClick"
				:close-on-escape="closeOnEscape"
				:show-close-button="showCloseButton"
				:aria-label="ariaLabel"
				:aria-description="ariaDescription"
				:stacked="stacked"
				:class="containerClass"
				@escape-key-down="emit('escapeKeyDown', $event)"
				@interact-outside="emit('interactOutside', $event)"
				@open-auto-focus="emit('openAutoFocus', $event)"
				@close-auto-focus="emit('closeAutoFocus', $event)"
			>
				<PongDialogHeader v-if="header">
					<PongDialogTitle>{{ header }}</PongDialogTitle>
				</PongDialogHeader>
				<slot />
			</PongDialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
