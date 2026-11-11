import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongAvatar from './Avatar.vue';

const meta = {
	title: 'Core/Avatar',
	component: PongAvatar,
	argTypes: {
		size: {
			control: 'select',
			options: ['xxsmall', 'xsmall', 'small', 'medium', 'large'],
		},
		firstName: { control: 'text' },
		lastName: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A user avatar component that renders profile images or initials in fixed sizes.',
			},
		},
	},
} satisfies Meta<typeof PongAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongAvatar },
		setup() {
			return { args };
		},
		template: '<PongAvatar v-bind="args" />',
	}),
	args: {
		firstName: 'Sunny',
		lastName: 'Side',
		size: 'medium',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { PongAvatar },
		template: `
			<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
				<PongAvatar first-name="Sunny" last-name="Side" size="xxsmall" />
				<PongAvatar first-name="Sunny" last-name="Side" size="xsmall" />
				<PongAvatar first-name="Sunny" last-name="Side" size="small" />
				<PongAvatar first-name="Sunny" last-name="Side" size="medium" />
				<PongAvatar first-name="Sunny" last-name="Side" size="large" />
			</div>
		`,
	}),
};
