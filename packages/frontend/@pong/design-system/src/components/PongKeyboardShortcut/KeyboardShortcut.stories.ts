import type { StoryFn } from '@storybook/vue3-vite';

import PongKeyboardShortcut from './PongKeyboardShortcut.vue';

export default {
	title: 'Core/KeyboardShortcut',
	component: PongKeyboardShortcut,

	parameters: {
		docs: {
			description: { component: 'A visual representation of keyboard shortcut key combinations.' },
		},
	},
};

const template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongKeyboardShortcut,
	},
	template: '<pong-keyboard-shortcut v-bind="args" />',
});

export const Default = template.bind({});
Default.args = {
	keys: ['s'],
};
