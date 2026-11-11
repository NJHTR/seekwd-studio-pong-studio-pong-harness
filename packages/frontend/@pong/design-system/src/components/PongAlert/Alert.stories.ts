import type { StoryFn } from '@storybook/vue3-vite';

import PongAlert from './Alert.vue';
import PongIcon from '../PongIcon';

export default {
	title: 'Core/Alert',
	component: PongAlert,
	argTypes: {
		type: {
			type: 'select',
			options: ['success', 'info', 'warning', 'error'],
		},
		effect: {
			type: 'select',
			options: ['light', 'dark'],
		},
	},

	parameters: {
		docs: {
			description: {
				component: 'A contextual message banner for success, info, warning, and error feedback.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongAlert,
	},
	template: '<pong-alert v-bind="args"><template #aside>custom content slot</template></pong-alert>',
});

export const Default = Template.bind({});
Default.args = {
	type: 'info',
	effect: 'light',
	title: 'Alert title',
	description: 'Alert description',
	center: false,
	showIcon: true,
	background: true,
};

export const Variants: StoryFn = () => ({
	components: { PongAlert },
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px;">
			<pong-alert type="success" title="Success" description="This is a success alert." />
			<pong-alert type="info" title="Info" description="This is an info alert." />
			<pong-alert type="warning" title="Warning" description="This is a warning alert." />
			<pong-alert type="error" title="Error" description="This is an error alert." />
		</div>
	`,
});

const TemplateForSlots: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongAlert,
		PongIcon,
	},
	template: `<pong-alert v-bind="args">
					<template #title>Title</template>
					Description
					<template #aside><button>Button</button></template>
					<template #icon>
						<pong-icon icon="grin-stars" size="xlarge" />
					</template>
				</pong-alert>`,
});

export const ContentInSlots = TemplateForSlots.bind({});
ContentInSlots.args = {
	type: 'info',
	effect: 'light',
	center: false,
	background: true,
	showIcon: false,
};
