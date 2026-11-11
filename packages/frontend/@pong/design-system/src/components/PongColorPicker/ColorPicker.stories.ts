import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongColorPicker from './ColorPicker.vue';

export default {
	title: 'Core/ColorPicker',
	component: PongColorPicker,
	argTypes: {
		disabled: {
			control: 'boolean',
		},
		size: {
			control: 'select',
			options: ['small', 'large'],
		},
		showAlpha: {
			control: 'boolean',
		},
		colorFormat: {
			control: 'select',
			options: ['hsl', 'hsv', 'hex', 'rgb'],
		},
		popperClass: {
			control: 'text',
		},
		predefine: {
			control: 'array',
		},
	},

	parameters: {
		docs: {
			description: { component: 'A color selection control for choosing and previewing colors.' },
		},
	},
};

const methods = {
	onChange: action('change'),
	onActiveChange: action('active-change'),
	onInput: action('update:modelValue'),
};

const DefaultTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongColorPicker,
	},
	data: () => ({
		color: null,
	}),
	template:
		'<pong-color-picker v-model="color" v-bind="args" @update:modelValue="onInput" @change="onChange" @active-change="onActiveChange" />',
	methods,
});

export const Default = DefaultTemplate.bind({});
Default.args = {
	disabled: false,
	size: 'small',
	showAlpha: false,
	colorFormat: '',
	popperClass: '',
	showInput: true,
};

export const Sizes: StoryFn = () => ({
	components: { PongColorPicker },
	template: `
		<div style="display: flex; gap: 16px; align-items: center;">
			<pong-color-picker size="small" />
			<pong-color-picker size="large" />
		</div>
	`,
});
