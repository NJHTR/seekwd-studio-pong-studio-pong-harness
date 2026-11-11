import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongText from './Text.vue';

const meta = {
	title: 'Core/Text',
	component: PongText,
	argTypes: {
		step: {
			control: 'select',
			options: [undefined, '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'mini', 'medium', 'large', 'xlarge'],
		},
		color: {
			control: 'select',
			options: [
				'primary',
				'secondary',
				'text-dark',
				'text-base',
				'text-light',
				'text-xlight',
				'danger',
				'success',
				'warning',
				'foreground-dark',
				'foreground-xdark',
			],
		},
	},
	parameters: {
		docs: {
			description: { component: 'A typography component for styled body text and inline copy.' },
		},
	},
} satisfies Meta<typeof PongText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongText },
		setup() {
			return { args };
		},
		template: '<PongText v-bind="args">hello world</PongText>',
	}),
	args: {
		size: 'medium',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { PongText },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<PongText size="xsmall">XSmall text</PongText>
				<PongText size="small">Small text</PongText>
				<PongText size="mini">Mini text</PongText>
				<PongText size="medium">Medium text</PongText>
				<PongText size="large">Large text</PongText>
				<PongText size="xlarge">XLarge text</PongText>
			</div>
		`,
	}),
};

export const Variants: Story = {
	render: () => ({
		components: { PongText },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<PongText color="primary">Primary</PongText>
				<PongText color="secondary">Secondary</PongText>
				<PongText color="text-dark">Text dark</PongText>
				<PongText color="text-base">Text base</PongText>
				<PongText color="text-light">Text light</PongText>
				<PongText color="text-xlight">Text xlight</PongText>
				<PongText color="danger">Danger</PongText>
				<PongText color="success">Success</PongText>
				<PongText color="warning">Warning</PongText>
				<PongText color="foreground-dark">Foreground dark</PongText>
				<PongText color="foreground-xdark">Foreground xdark</PongText>
			</div>
		`,
	}),
};

export const Steps: Story = {
	render: () => ({
		components: { PongText },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<PongText step="4xs">4xs text</PongText>
				<PongText step="3xs">3xs text</PongText>
				<PongText step="2xs">2xs text</PongText>
				<PongText step="xs">xs text</PongText>
				<PongText step="sm">sm text</PongText>
				<PongText step="md">md text</PongText>
				<PongText step="lg">lg text</PongText>
				<PongText step="xl">xl text</PongText>
				<PongText step="2xl">2xl text</PongText>
			</div>
		`,
	}),
};

export const Weights: Story = {
	render: () => ({
		components: { PongText },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<PongText>Regular text</PongText>
				<PongText bold>Bold text</PongText>
			</div>
		`,
	}),
};
