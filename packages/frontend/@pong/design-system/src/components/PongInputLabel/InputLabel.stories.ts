import type { StoryFn } from '@storybook/vue3-vite';

import PongInputLabel from './InputLabel.vue';

export default {
	title: 'Core/InputLabel',
	component: PongInputLabel,
	argTypes: {},
	parameters: {
		docs: {
			description: {
				component: 'A label element for form controls with optional helper and required markers.',
			},
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongInputLabel,
	},
	template: `
			<pong-input-label v-bind="args" />
		`,
});

export const Default = Template.bind({});
Default.args = {
	label: 'input label',
	tooltipText: 'more info...',
};
