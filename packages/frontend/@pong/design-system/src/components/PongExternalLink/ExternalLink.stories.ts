import type { StoryFn } from '@storybook/vue3-vite';

import PongText from '../PongText';
import PongExternalLink from './ExternalLink.vue';

export default {
	title: 'Core/ExternalLink',
	component: PongExternalLink,
	argTypes: {
		size: {
			control: 'select',
			options: ['small', 'medium', 'large'],
		},
		newWindow: {
			control: 'boolean',
		},
		inline: {
			control: 'boolean',
		},
	},

	parameters: {
		docs: {
			description: {
				component:
					'A link component for external destinations with external-link affordances. By default it is a standalone, padded control; set `inline` to render it as part of running text (same font and line height as the surrounding copy, underlined label, hover pill that does not shift the text). Pair `inline` with `size="small"` for body-sized text.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongExternalLink,
	},
	template: '<PongExternalLink v-bind="args">{{ args.default }}</PongExternalLink>',
});

export const Default = Template.bind({});
Default.args = {
	href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	size: 'medium',
	newWindow: true,
	default: 'Visit pong',
};

export const IconOnly = Template.bind({});
IconOnly.args = {
	href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	size: 'medium',
	newWindow: true,
};

export const Sizes: StoryFn = () => ({
	components: { PongExternalLink },
	template: `
		<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
			<PongExternalLink href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" size="small">Small</PongExternalLink>
			<PongExternalLink href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" size="medium">Medium</PongExternalLink>
			<PongExternalLink href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" size="large">Large</PongExternalLink>
		</div>
	`,
});

export const Inline: StoryFn = () => ({
	components: { PongExternalLink, PongText },
	template: `
		<div style="max-width: 32rem;">
			<PongText tag="p" size="medium" color="text-base">
				Use your API key to control pong programmatically. Try it in the
				<PongExternalLink inline size="small" href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">API playground</PongExternalLink>,
				or use the <PongExternalLink inline size="small" href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">Webhook node</PongExternalLink>
				if you only need to trigger workflows.
			</PongText>
		</div>
	`,
});

export const SameWindow = Template.bind({});
SameWindow.args = {
	href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	size: 'medium',
	newWindow: false,
	default: 'Visit pong',
};

export const WithClickHandler = Template.bind({});
WithClickHandler.args = {
	size: 'medium',
	onClick: () => alert('Clicked!'),
	default: 'Click me',
};
