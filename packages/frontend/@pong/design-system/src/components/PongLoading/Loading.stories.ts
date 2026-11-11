import type { StoryFn } from '@storybook/vue3-vite';

import PongLoading from './Loading.vue';
import PongCircleLoader from '../PongCircleLoader/CircleLoader.vue';
import PongSpinner from '../PongSpinner/Spinner.vue';

export default {
	title: 'Core/Loading',
	component: PongLoading,
	argTypes: {
		animated: {
			control: {
				type: 'boolean',
			},
		},
		loading: {
			control: {
				type: 'boolean',
			},
		},
		rows: {
			control: {
				type: 'select',
			},
			options: [1, 2, 3, 4, 5],
		},
		variant: {
			control: {
				type: 'select',
			},
			options: ['button', 'h1', 'image', 'p'],
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A set of loading indicators including skeleton, spinner, and progress states.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongLoading,
	},
	template: '<pong-loading v-bind="args"></pong-loading>',
});

export const Default = Template.bind({});
Default.args = {
	variant: 'p',
};

export const Variants: StoryFn = () => ({
	components: { PongLoading },
	template: `
		<div style="display: flex; flex-direction: column; gap: 16px;">
			<pong-loading variant="p" :rows="2" />
			<pong-loading variant="text" />
			<pong-loading variant="h1" />
			<pong-loading variant="h3" />
			<pong-loading variant="caption" />
			<pong-loading variant="button" />
			<pong-loading variant="image" />
			<pong-loading variant="circle" />
			<pong-loading variant="rect" />
		</div>
	`,
});

export const SpinnerVariants: StoryFn = () => ({
	components: {
		PongSpinner,
	},
	template: `
		<div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
			<pong-spinner type="dots" size="small" />
			<pong-spinner type="dots" size="medium" />
			<pong-spinner type="dots" size="large" />
			<pong-spinner type="ring" size="small" />
			<pong-spinner type="ring" size="medium" />
			<pong-spinner type="ring" size="large" />
		</div>
	`,
});

interface CircleLoaderArgs {
	radius: number;
	progress: number;
	strokeWidth: number;
}

const CircleLoaderTemplate: StoryFn<CircleLoaderArgs> = (args) => ({
	setup: () => ({ args }),
	components: {
		PongCircleLoader,
	},
	template: '<pong-circle-loader v-bind="args" />',
});

export const ProgressCircle = CircleLoaderTemplate.bind({});
ProgressCircle.args = {
	radius: 20,
	progress: 42,
	strokeWidth: 10,
};
