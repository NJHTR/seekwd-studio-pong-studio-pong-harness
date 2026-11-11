import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongHeading from './Heading.vue';

const meta = {
	title: 'Core/Heading',
	component: PongHeading,
	argTypes: {
		step: {
			control: 'select',
			options: [undefined, '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
		},
		size: {
			control: 'select',
			options: ['2xlarge', 'xlarge', 'large', 'medium', 'small'],
		},
		color: {
			control: 'select',
			options: ['primary', 'text-dark', 'text-base', 'text-light', 'text-xlight', 'danger'],
		},
	},
	parameters: {
		docs: {
			description: { component: 'A typographic heading component for section and page titles.' },
		},
	},
} satisfies Meta<typeof PongHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongHeading },
		setup() {
			return { args };
		},
		template: '<PongHeading v-bind="args">hello world</PongHeading>',
	}),
	args: {
		size: 'medium',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { PongHeading },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<PongHeading size="2xlarge">2XLarge heading</PongHeading>
				<PongHeading size="xlarge">XLarge heading</PongHeading>
				<PongHeading size="large">Large heading</PongHeading>
				<PongHeading size="medium">Medium heading</PongHeading>
				<PongHeading size="small">Small heading</PongHeading>
			</div>
		`,
	}),
};

export const Variants: Story = {
	render: () => ({
		components: { PongHeading },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<PongHeading color="primary">Primary</PongHeading>
				<PongHeading color="text-dark">Text dark</PongHeading>
				<PongHeading color="text-base">Text base</PongHeading>
				<PongHeading color="text-light">Text light</PongHeading>
				<PongHeading color="text-xlight">Text xlight</PongHeading>
				<PongHeading color="danger">Danger</PongHeading>
			</div>
		`,
	}),
};
