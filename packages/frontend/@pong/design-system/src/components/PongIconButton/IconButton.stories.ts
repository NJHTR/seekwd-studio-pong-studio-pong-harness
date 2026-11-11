import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongIconButton from './IconButton.vue';

const meta = {
	title: 'Core/IconButton',
	component: PongIconButton,
	argTypes: {
		icon: {
			control: 'text',
		},
		variant: {
			control: 'select',
			options: ['solid', 'brand', 'ghost', 'outline', 'destructive', 'success'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
		loading: {
			control: 'boolean',
		},
		disabled: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'An icon-only button. Prefer wrapping with `PongTooltip` and always provide an accessible `aria-label`.',
			},
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof PongIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongIconButton },
		setup() {
			return { args };
		},
		template: '<PongIconButton v-bind="args" aria-label="Create" />',
	}),
	args: {
		icon: 'plus',
		variant: 'solid',
		size: 'medium',
	},
};

export const Variants: Story = {
	render: () => ({
		components: { PongIconButton },
		template: `
			<div style="display: flex; gap: var(--spacing--xs); align-items: center; flex-wrap: wrap;">
				<PongIconButton icon="plus" aria-label="Create" variant="solid" />
				<PongIconButton icon="plus" aria-label="Create" variant="outline" />
				<PongIconButton icon="plus" aria-label="Create" variant="outline" />
				<PongIconButton icon="plus" aria-label="Create" variant="ghost" />
				<PongIconButton icon="trash-2" aria-label="Delete" variant="destructive" />
				<PongIconButton icon="check" aria-label="Confirm" variant="success" />
			</div>
		`,
	}),
	args: {
		icon: 'plus',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { PongIconButton },
		template: `
			<div style="display: flex; gap: var(--spacing--xs); align-items: center; flex-wrap: wrap;">
				<PongIconButton icon="plus" aria-label="Create" variant="solid" size="xsmall" />
				<PongIconButton icon="plus" aria-label="Create" variant="solid" size="small" />
				<PongIconButton icon="plus" aria-label="Create" variant="solid" size="medium" />
				<PongIconButton icon="plus" aria-label="Create" variant="solid" size="large" />
				<PongIconButton icon="plus" aria-label="Create" variant="solid" size="xlarge" />
			</div>
		`,
	}),
	args: {
		icon: 'plus',
	},
};

export const States: Story = {
	render: () => ({
		components: { PongIconButton },
		template: `
			<div style="display: flex; gap: var(--spacing--xs); align-items: center; flex-wrap: wrap;">
				<PongIconButton icon="plus" aria-label="Create" variant="solid" />
				<PongIconButton icon="plus" aria-label="Create" variant="solid" :loading="true" />
				<PongIconButton icon="plus" aria-label="Create" variant="solid" :disabled="true" />
			</div>
		`,
	}),
	args: {
		icon: 'plus',
	},
};
