import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongBlockUi from './BlockUi.vue';

const meta = {
	title: 'Core/BlockUI',
	component: PongBlockUi,
	argTypes: {
		show: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'An overlay that blocks interaction and communicates loading or disabled state.',
			},
		},
	},
} satisfies Meta<typeof PongBlockUi>;

export default meta;
type Story = StoryObj<typeof meta>;

const renderWithContent: Story['render'] = (args) => ({
	components: { PongBlockUi },
	setup() {
		return { args };
	},
	template: `
		<div
			style="
				position: relative;
				width: 100%;
				padding: var(--spacing--lg);
				border: 1px solid var(--color--foreground);
				border-radius: var(--radius--lg);
				background: var(--background--surface);
			"
		>
			<p>This content cannot be interacted with while the overlay is shown.</p>
			<p>Use the show control to toggle the blocking overlay.</p>
			<PongBlockUi v-bind="args" />
		</div>
	`,
});

export const Default: Story = {
	render: renderWithContent,
	args: {
		show: true,
	},
};

export const Hidden: Story = {
	render: renderWithContent,
	args: {
		show: false,
	},
};
