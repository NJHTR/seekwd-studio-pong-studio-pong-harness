import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongNotice from './Notice.vue';

const meta = {
	title: 'Core/Notice',
	component: PongNotice,
	argTypes: {
		theme: {
			control: 'select',
			options: ['success', 'warning', 'danger', 'info'],
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A dismissible notification banner for informational or warning messages.',
			},
		},
	},
} satisfies Meta<typeof PongNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongNotice },
		setup() {
			return { args };
		},
		template:
			'<PongNotice v-bind="args">This is a notice! Thread carefully from this point forward.</PongNotice>',
	}),
	args: {
		theme: 'warning',
	},
};

export const Variants: Story = {
	render: () => ({
		components: { PongNotice },
		template: `
			<div style="display: flex; flex-direction: column; gap: 12px;">
				<PongNotice theme="warning">This is a warning notice.</PongNotice>
				<PongNotice theme="danger">This is a danger notice.</PongNotice>
				<PongNotice theme="success">This is a success notice.</PongNotice>
				<PongNotice theme="info">This is an info notice.</PongNotice>
			</div>
		`,
	}),
};

export const Sanitized: Story = {
	render: (args) => ({
		components: { PongNotice },
		setup() {
			return { args };
		},
		template: '<PongNotice v-bind="args" />',
	}),
	args: {
		theme: 'warning',
		content:
			'<script>alert(1)</script> This content contains a script tag and is <strong>sanitized</strong>.',
	},
};

export const FullContent: Story = {
	render: (args) => ({
		components: { PongNotice },
		setup() {
			return { args };
		},
		template: '<PongNotice v-bind="args" />',
	}),
	args: {
		theme: 'warning',
		content: 'This is just the summary. <a data-key="toggle-expand">Show more</a>',
		fullContent:
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ut labore et dolore magna aliqua. <a data-key="show-less">Show less</a>',
	},
};

export const HtmlEdgeCase: Story = {
	render: (args) => ({
		components: { PongNotice },
		setup() {
			return { args };
		},
		template: '<PongNotice v-bind="args" />',
	}),
	args: {
		theme: 'warning',
		content:
			'This content is long and will be truncated at 150 characters. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod <a href="">read the documentation</a> ut labore et dolore magna aliqua. <ul><li>Item 1</li><li>Item 2</li></ul>',
	},
};
