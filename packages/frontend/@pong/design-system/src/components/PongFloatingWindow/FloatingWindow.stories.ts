import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongFloatingWindow from './FloatingWindow.vue';
import PongIcon from '../PongIcon';

const meta: Meta<typeof PongFloatingWindow> = {
	title: 'Core/FloatingWindow',
	component: PongFloatingWindow,
	argTypes: {
		width: {
			control: { type: 'number' },
		},
		height: {
			control: { type: 'number' },
		},
		minWidth: {
			control: { type: 'number' },
		},
		minHeight: {
			control: { type: 'number' },
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A draggable and resizable floating panel with header and content regions.',
			},
			story: {
				inline: false,
				iframeHeight: 500,
			},
		},
	},
	render: (args) => ({
		components: {
			PongFloatingWindow,
			PongIcon,
		},
		setup: () => ({
			args,
			onClose: action('close'),
			onResize: action('resize'),
			onMove: action('move'),
		}),
		template: `
			<div
				style="
					position: relative;
					width: 100%;
					height: 480px;
					overflow: hidden;
				"
			>
				<pong-floating-window
					v-bind="args"
					style="position: absolute;"
					@close="onClose"
					@resize="onResize"
					@move="onMove"
				>
					<template #header-icon>
						<pong-icon icon="comment-dots" size="medium" />
					</template>
					<template #header>Floating Window</template>
					<template #header-actions>
						<pong-icon icon="expand" size="small" style="cursor: pointer;" />
					</template>
					<div style="padding: 16px;">
						<p>This is the default slot content. The window can be dragged by its header and resized from any edge or corner.</p>
					</div>
				</pong-floating-window>
			</div>
		`,
	}),
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		width: 360,
		height: 280,
		minWidth: 240,
		minHeight: 180,
		initialPosition: { x: 16, y: 16 },
	},
};
