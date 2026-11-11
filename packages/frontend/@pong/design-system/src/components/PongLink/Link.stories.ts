import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongLink from './Link.vue';

export default {
	title: 'Core/Link',
	component: PongLink,
	argTypes: {
		size: {
			control: {
				type: 'select',
			},
			options: ['small', 'medium', 'large'],
		},
	},

	parameters: {
		docs: {
			description: { component: 'A text link component for navigation and inline actions.' },
		},
	},
};

const methods = {
	onClick: action('click'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongLink,
	},
	template: '<pong-link v-bind="args" @click="onClick">hello world</pong-link>',
	methods,
});

export const Default = Template.bind({});
Default.args = {
	href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
};

export const Sizes: StoryFn = () => ({
	components: { PongLink },
	template: `
		<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
			<pong-link href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" size="small">Small</pong-link>
			<pong-link href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" size="medium">Medium</pong-link>
			<pong-link href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" size="large">Large</pong-link>
		</div>
	`,
});

export const Variants: StoryFn = () => ({
	components: { PongLink },
	template: `
		<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
			<pong-link href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" theme="primary">Primary</pong-link>
			<pong-link href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" theme="secondary">Secondary</pong-link>
			<pong-link href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" theme="text">Text</pong-link>
			<pong-link href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" theme="danger">Danger</pong-link>
		</div>
	`,
});
