import type { StoryFn } from '@storybook/vue3-vite';

import PongLogo from './Logo.vue';

export default {
	title: 'Core/Logo',
	component: PongLogo,
	argTypes: {
		size: {
			control: {
				type: 'select',
				options: ['large', 'small'],
			},
		},
		collapsed: {
			control: 'boolean',
			if: { arg: 'size', eq: 'small' },
		},
		releaseChannel: {
			control: {
				type: 'select',
				options: ['stable', 'dev', 'beta', 'nightly'],
			},
		},
	},

	parameters: {
		docs: {
			description: { component: 'The pong logo component in icon and wordmark variants.' },
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongLogo,
	},
	template: '<PongLogo v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	size: 'large',
	releaseChannel: 'stable',
};

export const Sizes: StoryFn = () => ({
	components: { PongLogo },
	template: `
		<div style="display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing--xl); padding: var(--spacing--2xl);">
			<div style="min-width: var(--spacing--5xl); display: flex; align-items: center;">
				<PongLogo size="large" release-channel="stable" />
			</div>
			<PongLogo size="small" :collapsed="false" release-channel="stable" />
			<PongLogo size="small" :collapsed="true" release-channel="stable" />
		</div>
	`,
});

export const Variants: StoryFn = () => ({
	components: { PongLogo },
	template: `
		<div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing--2xl); padding: var(--spacing--2xl);">
			<PongLogo size="large" release-channel="stable" />
			<PongLogo size="large" release-channel="dev" />
			<PongLogo size="large" release-channel="beta" />
			<PongLogo size="large" release-channel="nightly" />
		</div>
	`,
});
