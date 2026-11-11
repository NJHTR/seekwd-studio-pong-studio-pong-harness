import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongSelect from './Select.vue';
import PongIcon from '../PongIcon';
import PongOption from '../PongOption';

export default {
	title: 'Core/Select',
	component: PongSelect,
	argTypes: {
		disabled: {
			control: {
				type: 'boolean',
			},
		},
		size: {
			control: {
				type: 'select',
			},
			options: ['large', 'medium', 'small', 'mini'],
		},
		loading: {
			control: {
				type: 'boolean',
			},
		},
		filterable: {
			control: {
				type: 'boolean',
			},
		},
		defaultFirstOption: {
			control: {
				type: 'boolean',
			},
		},
	},
	parameters: {
		docs: {
			description: { component: 'A select input for choosing from predefined options.' },
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
	onChange: action('change'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongSelect,
		PongOption,
		PongIcon,
	},
	template:
		'<pong-select v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" @change="onChange"><pong-option value="1">op1</pong-option><pong-option value="2">op2</pong-option></pong-select>',
	data() {
		return {
			val: '',
		};
	},
	methods,
});

export const Default = Template.bind({});

export const Filterable = Template.bind({});
Filterable.args = {
	filterable: true,
	defaultFirstOption: true,
};

const selects = ['large', 'medium', 'small', 'mini']
	.map(
		(size) =>
			`<pong-select v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" @change="onChange" size="${size}"><pong-option value="1">op1</pong-option><pong-option value="2">op2</pong-option></pong-select>`,
	)
	.join('');

const ManyTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongSelect,
		PongOption,
		PongIcon,
	},
	template: `<div style="display: flex; flex-direction: column; gap: var(--spacing--xs);">${selects}</div>`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const Sizes = ManyTemplate.bind({});
Sizes.args = {
	type: 'text',
	label: 'text input:',
	placeholder: 'placeholder...',
};

const selectsWithIcon = ['xlarge', 'large', 'medium', 'small', 'mini']
	.map(
		(size) =>
			`<pong-select v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" size="${size}"><pong-icon icon="search" slot="prefix" /><pong-option value="1">op1</pong-option><pong-option value="2">op2</pong-option></pong-select>`,
	)
	.join('');

const ManyTemplateWithIcon: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongSelect,
		PongOption,
		PongIcon,
	},
	template: `<div style="display: flex; flex-direction: column; gap: var(--spacing--xs);">${selectsWithIcon}</div>`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const WithIcon = ManyTemplateWithIcon.bind({});
WithIcon.args = {
	type: 'text',
	label: 'text input:',
	placeholder: 'placeholder...',
};

const LimitedWidthTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongSelect,
		PongOption,
		PongIcon,
	},
	template:
		'<div style="width:100px;"><pong-select v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" @change="onChange"><pong-option value="1" label="opt1 11 1111" /><pong-option value="2" label="opt2 test very long ipsum"/></pong-select></div>',
	data() {
		return {
			val: '',
		};
	},
	methods,
});

export const LimitedWidth = LimitedWidthTemplate.bind({});
LimitedWidth.args = {
	type: 'text',
	label: 'text input:',
	placeholder: 'placeholder...',
};
