import type { StoryFn } from '@storybook/vue3-vite';

import PongPulse from './Pulse.vue';

export default {
	title: 'Core/Pulse',
	component: PongPulse,
	argTypes: {},
	parameters: {
		docs: {
			description: { component: 'A pulsing status indicator for active or live states.' },
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

export const Default: StoryFn = () => ({
	components: {
		PongPulse,
	},
	template: '<pong-pulse> yo </pong-pulse>',
});
