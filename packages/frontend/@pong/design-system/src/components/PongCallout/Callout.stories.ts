import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongCallout from './Callout.vue';
import PongLink from '../PongLink';

const meta = {
	title: 'Core/Callout',
	component: PongCallout,
	argTypes: {
		theme: {
			control: 'select',
			options: ['info', 'secondary', 'success', 'warning', 'danger', 'custom'],
		},
		icon: { control: 'text' },
		default: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component: 'A highlighted information panel for announcements, tips, or warnings.',
			},
		},
		design: {
			type: 'figma',
			url: 'https://www.figma.com/file/tPpJvbrnHbP8C496cYuwyW/Node-pinning?node-id=15%3A5777',
		},
	},
} satisfies Meta<typeof PongCallout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongCallout },
		setup() {
			return { args };
		},
		template: `
			<PongCallout v-bind="args">
				{{ args.default }}
			</PongCallout>
		`,
	}),
	args: {
		theme: 'success',
		default: 'This is a default callout.',
	},
};

export const Variants: Story = {
	render: () => ({
		components: { PongCallout },
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xs);">
				<PongCallout theme="info">This is an info callout.</PongCallout>
				<PongCallout theme="secondary">This is a secondary callout.</PongCallout>
				<PongCallout theme="success">This is a success callout.</PongCallout>
				<PongCallout theme="warning">This is a warning callout.</PongCallout>
				<PongCallout theme="danger">This is a danger callout.</PongCallout>
				<PongCallout theme="custom" icon="git-branch">This is a custom callout.</PongCallout>
			</div>
		`,
	}),
	args: {
		theme: 'info',
	},
};

export const Custom: Story = {
	render: (args) => ({
		components: { PongCallout, PongLink },
		setup() {
			return { args };
		},
		template: `
			<PongCallout v-bind="args">
				{{ args.default }}
				<template #actions>
					<PongLink size="small">Do something!</PongLink>
				</template>
			</PongCallout>
		`,
	}),
	args: {
		theme: 'custom',
		icon: 'git-branch',
		default: 'This is a custom callout.',
	},
};
