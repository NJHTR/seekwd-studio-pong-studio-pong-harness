import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import { PongAlertDialog } from './index';
import PongButton from '../PongButton/Button.vue';

const meta = {
	title: 'Core/AlertDialog',
	component: PongAlertDialog,
	parameters: {
		docs: {
			description: { component: 'A confirmation dialog for destructive or high-impact actions.' },
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['small', 'medium'],
		},
		actionVariant: {
			control: { type: 'select' },
			options: ['solid', 'destructive'],
		},
	},
} satisfies Meta<typeof PongAlertDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	render: () => ({
		components: {
			PongAlertDialog,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			const handleConfirm = () => {
				console.log('Confirmed!');
				isOpen.value = false;
			};
			return { isOpen, handleConfirm };
		},
		template: `
		<div>
			<PongButton label="Save" @click="isOpen = true" />
			<PongAlertDialog
				v-model:open="isOpen"
				title="Save changes?"
				description="Your changes will be saved to the server."
				action-label="Save"
				@action="handleConfirm"
			/>
		</div>
		`,
	}),
	args: {
		title: 'Save changes?',
	},
} satisfies Story;

export const Destructive = {
	render: () => ({
		components: {
			PongAlertDialog,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			const handleDelete = () => {
				console.log('Deleted!');
				isOpen.value = false;
			};
			return { isOpen, handleDelete };
		},
		template: `
		<div>
			<PongButton label="Delete" variant="destructive" @click="isOpen = true" />
			<PongAlertDialog
				v-model:open="isOpen"
				title="Delete item?"
				description="This action cannot be undone. This will permanently delete the item."
				action-label="Delete"
				action-variant="destructive"
				@action="handleDelete"
			/>
		</div>
		`,
	}),
	args: {
		title: 'Delete item?',
	},
} satisfies Story;

export const WithLoading = {
	render: () => ({
		components: {
			PongAlertDialog,
			PongButton,
		},
		setup() {
			const loading = ref(false);
			const isOpen = ref(false);

			const handleAction = async () => {
				loading.value = true;
				await new Promise((resolve) => setTimeout(resolve, 2000));
				loading.value = false;
				isOpen.value = false;
			};

			return { loading, isOpen, handleAction };
		},
		template: `
		<div>
			<PongButton label="Start Process" @click="isOpen = true" />
			<PongAlertDialog
				v-model:open="isOpen"
				title="Process data?"
				description="This operation may take a few seconds."
				action-label="Process"
				:loading="loading"
				@action="handleAction"
			/>
		</div>
		`,
	}),
	args: {
		title: 'Process data?',
	},
} satisfies Story;

export const Sizes = {
	render: () => ({
		components: {
			PongAlertDialog,
			PongButton,
		},
		setup() {
			const isSmallOpen = ref(false);
			const isMediumOpen = ref(false);
			return { isSmallOpen, isMediumOpen };
		},
		template: `
		<div style="display: flex; gap: 16px;">
			<PongButton label="Small" variant="outline" @click="isSmallOpen = true" />
			<PongAlertDialog
				v-model:open="isSmallOpen"
				title="Small Dialog"
				description="This is a small alert dialog."
				size="small"
			/>

			<PongButton label="Medium" variant="outline" @click="isMediumOpen = true" />
			<PongAlertDialog
				v-model:open="isMediumOpen"
				title="Medium Dialog"
				description="This is a medium alert dialog with more space for content."
				size="medium"
			/>
		</div>
		`,
	}),
	args: {
		title: 'Small Dialog',
	},
} satisfies Story;

export const Variants = {
	render: () => ({
		components: {
			PongAlertDialog,
			PongButton,
		},
		setup() {
			const isSolidOpen = ref(false);
			const isDestructiveOpen = ref(false);
			return { isSolidOpen, isDestructiveOpen };
		},
		template: `
		<div style="display: flex; gap: 16px;">
			<PongButton label="Solid" @click="isSolidOpen = true" />
			<PongAlertDialog
				v-model:open="isSolidOpen"
				title="Save changes?"
				description="Your changes will be saved to the server."
				action-label="Save"
				action-variant="solid"
			/>

			<PongButton label="Destructive" variant="destructive" @click="isDestructiveOpen = true" />
			<PongAlertDialog
				v-model:open="isDestructiveOpen"
				title="Delete item?"
				description="This action cannot be undone."
				action-label="Delete"
				action-variant="destructive"
			/>
		</div>
		`,
	}),
	args: {
		title: 'Save changes?',
	},
} satisfies Story;
