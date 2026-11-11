import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongSelectedItemsInfo from './SelectedItemsInfo.vue';
import PongButton from '../PongButton';

const meta = {
	title: 'Core/SelectedItemsInfo',
	component: PongSelectedItemsInfo,
	argTypes: {
		selectedCount: { control: 'number' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'Floating bar that shows how many list rows are selected, with bulk actions and a clear-selection button. It is positioned absolutely at the bottom of its closest positioned ancestor.',
			},
		},
	},
} satisfies Meta<typeof PongSelectedItemsInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

const methods = {
	onDeleteSelected: action('deleteSelected'),
	onClearSelection: action('clearSelection'),
};

export const Default: Story = {
	render: (args) => ({
		components: { PongSelectedItemsInfo },
		setup() {
			return { args, ...methods };
		},
		template: `
			<div style="position: relative; height: 200px;">
				<PongSelectedItemsInfo
					v-bind="args"
					@delete-selected="onDeleteSelected"
					@clear-selection="onClearSelection"
				/>
			</div>
		`,
	}),
	args: {
		selectedCount: 3,
	},
};

export const CustomActions: Story = {
	render: (args) => ({
		components: { PongSelectedItemsInfo, PongButton },
		setup() {
			return { args, ...methods };
		},
		template: `
			<div style="position: relative; height: 200px;">
				<PongSelectedItemsInfo v-bind="args" @clear-selection="onClearSelection">
					<template #actions>
						<PongButton variant="outline" label="Archive" />
						<PongButton variant="outline" label="Export" />
					</template>
				</PongSelectedItemsInfo>
			</div>
		`,
	}),
	args: {
		selectedCount: 1,
	},
};
