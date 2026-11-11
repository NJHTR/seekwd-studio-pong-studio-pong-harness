import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongIconButton from '../PongIconButton';
import PongTooltip from '../PongTooltip';
import PongChatActions from './ChatActions.vue';

const meta = {
	title: 'Areas/Assistant/ChatActions',
	component: PongChatActions,
	argTypes: {
		content: { control: 'text' },
		showCopy: { control: 'boolean' },
		showReadAloud: { control: 'boolean' },
		copyLabel: { control: 'text' },
		readAloudLabel: { control: 'text' },
		onCopy: { action: 'copy' },
		onReadAloud: { action: 'readAloud' },
	},
	parameters: {
		docs: {
			description: {
				component: 'Actions for copying or reading an assistant response aloud.',
			},
		},
	},
} satisfies Meta<typeof PongChatActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: function render(args) {
		return {
			components: { PongChatActions },
			setup: function setup() {
				return { args };
			},
			template: `
				<div>
					<p>{{ args.content }}</p>
					<PongChatActions v-bind="args" />
				</div>
			`,
		};
	},
	args: {
		content: 'The workflow is ready.',
		showCopy: true,
		copyLabel: 'Copy',
		onCopy: action('copy'),
		showReadAloud: true,
		readAloudLabel: 'Read aloud',
		onReadAloud: action('readAloud'),
	},
};

export const CopyOnly: Story = {
	render: function render(args) {
		return {
			components: { PongChatActions },
			setup: function setup() {
				return { args };
			},
			template: `
				<div>
					<p>{{ args.content }}</p>
					<PongChatActions v-bind="args" />
				</div>
			`,
		};
	},
	args: {
		content: 'Copy this message to the clipboard.',
		showCopy: true,
		copyLabel: 'Copy',
		onCopy: action('copy'),
		showReadAloud: false,
	},
};

export const ReadAloudOnly: Story = {
	render: function render(args) {
		return {
			components: { PongChatActions },
			setup: function setup() {
				return { args };
			},
			template: `
				<div>
					<p>{{ args.content }}</p>
					<PongChatActions v-bind="args" />
				</div>
			`,
		};
	},
	args: {
		content: 'Read this message aloud.',
		showCopy: false,
		showReadAloud: true,
		readAloudLabel: 'Read aloud',
		onReadAloud: action('readAloud'),
	},
};

export const WithCustomActions: Story = {
	render: function render(args) {
		return {
			components: { PongChatActions, PongIconButton, PongTooltip },
			setup: function setup() {
				function handleThumbsUp() {
					window.alert('Thumbs up selected');
				}

				function handleThumbsDown() {
					window.alert('Thumbs down selected');
				}

				return { args, handleThumbsUp, handleThumbsDown };
			},
			template: `
				<p>{{ args.content }}</p>
				<PongChatActions v-bind="args">
					<PongTooltip content="Helpful" placement="bottom">
						<PongIconButton
							icon="thumbs-up"
							variant="ghost"
							size="small"
							icon-size="medium"
							aria-label="Helpful"
							@click="handleThumbsUp"
						/>
					</PongTooltip>
					<PongTooltip content="Not helpful" placement="bottom">
						<PongIconButton
							icon="thumbs-down"
							variant="ghost"
							size="small"
							icon-size="medium"
							aria-label="Not helpful"
							@click="handleThumbsDown"
						/>
					</PongTooltip>
				</PongChatActions>
			`,
		};
	},
	args: {
		content: 'The workflow is ready.',
		showCopy: true,
		copyLabel: 'Copy',
		onCopy: action('copy'),
		showReadAloud: true,
		readAloudLabel: 'Read aloud',
		onReadAloud: action('readAloud'),
	},
};
