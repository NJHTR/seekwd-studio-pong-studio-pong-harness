import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongSpinner from './Spinner.vue';

const meta = {
	title: 'Core/Spinner',
	component: PongSpinner,
	argTypes: {
		type: {
			control: 'select',
			options: ['dots', 'ring', 'grid'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'],
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A loading spinner for inline and block loading states.',
			},
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof PongSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongSpinner },
		setup() {
			return { args };
		},
		template: '<PongSpinner v-bind="args" />',
	}),
	args: {
		type: 'grid',
		size: 'medium',
	},
};

const sizes = ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'] as const;

function renderSizes(type: 'dots' | 'ring' | 'grid') {
	return {
		components: { PongSpinner },
		setup() {
			return { sizes };
		},
		template: `
			<div style="display: flex; align-items: center; gap: var(--spacing--lg); flex-wrap: wrap;">
				<div v-for="size in sizes" :key="size" style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing--2xs);">
					<PongSpinner :type="'${type}'" :size="size" />
					<span>{{ size }}</span>
				</div>
			</div>
		`,
	};
}

export const Dots: Story = {
	render: () => renderSizes('dots'),
};

export const Ring: Story = {
	render: () => renderSizes('ring'),
};

export const Grid: Story = {
	render: () => renderSizes('grid'),
};
