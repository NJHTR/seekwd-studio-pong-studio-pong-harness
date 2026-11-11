import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongSendStopButton from './PongSendStopButton.vue';

const meta = {
	title: 'Core/SendStopButton',
	component: PongSendStopButton,
	argTypes: {
		streaming: { control: 'boolean' },
		disabled: { control: 'boolean' },
		size: {
			control: 'select',
			options: ['mini', 'small', 'medium', 'large'],
		},
		label: { control: 'text' },
		sendButtonTestId: { table: { disable: true } },
		stopButtonTestId: { table: { disable: true } },
	},
	parameters: {
		docs: {
			description: { component: 'A dual-state button that toggles between send and stop actions.' },
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof PongSendStopButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongSendStopButton },
		setup() {
			return { args };
		},
		template: '<PongSendStopButton v-bind="args" />',
	}),
	args: {
		streaming: false,
		disabled: false,
		size: 'medium',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { PongSendStopButton },
		template: `
			<div style="display: flex; flex-direction: column; gap: 16px;">
				<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
					<PongSendStopButton size="mini" />
					<PongSendStopButton size="small" />
					<PongSendStopButton size="medium" />
					<PongSendStopButton size="large" />
				</div>
				<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
					<PongSendStopButton size="mini" streaming />
					<PongSendStopButton size="small" streaming />
					<PongSendStopButton size="medium" streaming />
					<PongSendStopButton size="large" streaming />
				</div>
			</div>
		`,
	}),
};

export const States: Story = {
	render: () => ({
		components: { PongSendStopButton },
		template: `
			<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
				<PongSendStopButton />
				<PongSendStopButton disabled />
				<PongSendStopButton streaming />
				<PongSendStopButton label="Send" />
			</div>
		`,
	}),
};
