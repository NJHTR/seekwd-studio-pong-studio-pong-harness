<script setup lang="ts">
import { DialogRoot, DialogPortal } from 'reka-ui';

import PongButton from '../PongButton/Button.vue';
import PongDialogContent from '../PongDialog/DialogContent.vue';
import PongDialogDescription from '../PongDialog/DialogDescription.vue';
import PongDialogFooter from '../PongDialog/DialogFooter.vue';
import PongDialogHeader from '../PongDialog/DialogHeader.vue';
import PongDialogBody from '../PongDialog/DialogBody.vue';
import PongDialogOverlay from '../PongDialog/DialogOverlay.vue';
import PongDialogTitle from '../PongDialog/DialogTitle.vue';

export type AlertDialogActionVariant = 'solid' | 'destructive';
export type AlertDialogSize = 'small' | 'medium';

export interface AlertDialogProps {
	/**
	 * Controlled open state of the alert dialog
	 */
	open?: boolean;
	/**
	 * The open state of the alert dialog when it is initially rendered.
	 * Use when you do not need to control its open state.
	 */
	defaultOpen?: boolean;
	/**
	 * Dialog title text (required)
	 */
	title: string;
	/**
	 * Optional description text
	 */
	description?: string;
	/**
	 * Label for the action button
	 * @default 'Confirm'
	 */
	actionLabel?: string;
	/**
	 * Visual style of the action button
	 * @default 'solid'
	 */
	actionVariant?: AlertDialogActionVariant;
	/**
	 * Label for the cancel button
	 * @default 'Cancel'
	 */
	cancelLabel?: string;
	/**
	 * Shows loading state on action button
	 * @default false
	 */
	loading?: boolean;
	/**
	 * Dialog width
	 * @default 'small'
	 */
	size?: AlertDialogSize;
	/**
	 * Render above another open dialog
	 * @default false
	 */
	stacked?: boolean;
}

export interface AlertDialogEmits {
	'update:open': [open: boolean];
	action: [];
	cancel: [];
}

withDefaults(defineProps<AlertDialogProps>(), {
	actionLabel: 'Confirm',
	actionVariant: 'solid',
	cancelLabel: 'Cancel',
	loading: false,
	size: 'small',
	stacked: false,
});

const emit = defineEmits<AlertDialogEmits>();

defineSlots<{
	/**
	 * Optional additional content between description and footer
	 */
	default?: () => unknown;
}>();

const handleOpenChange = (value: boolean) => {
	emit('update:open', value);
};

const handleAction = () => {
	emit('action');
};

const handleCancel = () => {
	emit('cancel');
	handleOpenChange(false);
};
</script>

<template>
	<DialogRoot :open="open" :default-open="defaultOpen" @update:open="handleOpenChange">
		<DialogPortal>
			<PongDialogOverlay :stacked="stacked" />
			<PongDialogContent :size="size" :show-close-button="false" :stacked="stacked">
				<PongDialogHeader>
					<PongDialogTitle>{{ title }}</PongDialogTitle>
					<PongDialogDescription v-if="description">
						{{ description }}
					</PongDialogDescription>
				</PongDialogHeader>

				<PongDialogBody v-if="$slots.default">
					<slot />
				</PongDialogBody>

				<PongDialogFooter>
					<PongButton variant="outline" :label="cancelLabel" @click="handleCancel" />
					<PongButton
						:variant="actionVariant === 'destructive' ? 'destructive' : 'solid'"
						:label="actionLabel"
						:loading="loading"
						@click="handleAction"
					/>
				</PongDialogFooter>
			</PongDialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
