import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongButtonList from './ButtonList.vue';
import PongButton from '../PongButton/Button.vue';
import PongIconButton from '../PongIconButton/IconButton.vue';

const meta = {
	title: 'Core/ButtonList',
	component: PongButtonList,
	parameters: {
		docs: {
			description: {
				component:
					'Layout wrapper that applies consistent spacing between a group of buttons or icon buttons.',
			},
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
			description: 'Layout orientation of the buttons',
		},
		variant: {
			control: 'select',
			options: ['default', 'toolbar'],
			description: 'Visual style of the button group',
		},
	},
} satisfies Meta<typeof PongButtonList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongButtonList, PongButton },
		setup() {
			return { args };
		},
		template: `
			<PongButtonList v-bind="args">
				<PongButton variant="outline">Save</PongButton>
				<PongButton variant="solid">Publish</PongButton>
				<PongButton variant="ghost">More</PongButton>
			</PongButtonList>
		`,
	}),
	args: {
		orientation: 'horizontal',
	},
};

export const IconButtons: Story = {
	render: (args) => ({
		components: { PongButtonList, PongIconButton },
		setup() {
			return { args };
		},
		template: `
			<PongButtonList v-bind="args">
				<PongIconButton variant="outline" size="large" icon="maximize" aria-label="Zoom to fit" />
				<PongIconButton variant="outline" size="large" icon="zoom-in" aria-label="Zoom in" />
				<PongIconButton variant="outline" size="large" icon="zoom-out" aria-label="Zoom out" />
			</PongButtonList>
		`,
	}),
	args: {
		orientation: 'horizontal',
	},
};

export const Vertical: Story = {
	render: (args) => ({
		components: { PongButtonList, PongIconButton },
		setup() {
			return { args };
		},
		template: `
			<PongButtonList v-bind="args">
				<PongIconButton variant="outline" size="large" icon="plus" aria-label="Add" />
				<PongIconButton variant="outline" size="large" icon="search" aria-label="Search" />
				<PongIconButton variant="outline" size="large" icon="sticky-note" aria-label="Sticky note" />
			</PongButtonList>
		`,
	}),
	args: {
		orientation: 'vertical',
	},
};

export const Toolbar: Story = {
	render: (args) => ({
		components: { PongButtonList, PongIconButton },
		setup() {
			return { args };
		},
		template: `
			<PongButtonList v-bind="args">
				<PongIconButton variant="ghost" size="large" icon="maximize" aria-label="Zoom to fit" />
				<PongIconButton variant="ghost" size="large" icon="zoom-in" aria-label="Zoom in" />
				<PongIconButton variant="ghost" size="large" icon="zoom-out" aria-label="Zoom out" />
			</PongButtonList>
		`,
	}),
	args: {
		orientation: 'horizontal',
		variant: 'toolbar',
	},
};
