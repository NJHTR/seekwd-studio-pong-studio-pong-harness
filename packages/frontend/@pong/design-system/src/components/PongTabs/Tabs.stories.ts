import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongTabs from './Tabs.vue';
import type { TabOptions } from '../../types/tabs';

export default {
	title: 'Core/Tabs',
	component: PongTabs,
	argTypes: {},
	parameters: {
		docs: {
			description: {
				component: 'A tab navigation component for switching between content panels.',
			},
		},
		backgrounds: { default: '--color--background--light-3' },
	},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongTabs,
	},
	template: `<pong-tabs v-model="val" v-bind="args" @update:modelValue="onUpdateModelValue">
		</pong-tabs>`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const Default = Template.bind({});
Default.args = {
	modelValue: 'first',
	options: [
		{
			label: 'First',
			value: 'first',
		},
		{
			label: 'Second',
			value: 'second',
		},
		{
			label: 'Github',
			value: 'github',
			href: 'https://github.com/',
		},
		{
			label: 'Settings',
			value: 'settings',
			icon: 'cog',
			align: 'right',
		},
	],
};

const options: Array<TabOptions<string>> = [
	{
		label: 'First',
		value: 'first',
	},
	{
		label: 'Second',
		value: 'second',
	},
	{
		label: 'External Link',
		value: 'external',
		href: 'https://github.com/',
	},
	{
		label: 'Danger',
		value: 'danger',
		variant: 'danger',
		icon: 'triangle-alert',
	},
	{
		label: 'Right Icon',
		value: 'rightIcon',
		icon: 'circle',
		iconPosition: 'right',
	},
	{
		value: 'iconOnly',
		tooltip: 'Icon only tab',
		icon: 'circle',
	},
	{
		label: 'Notification',
		value: 'notification',
		notification: true,
	},
	{
		label: 'Count',
		value: 'count',
		tag: '2',
	},
	{
		label: 'Settings',
		value: 'settings',
		icon: 'cog',
		align: 'right',
	},
];

export const Variants = Template.bind({});
Variants.args = {
	modelValue: 'first',
	options,
};

export const Overflow: StoryFn = () => ({
	components: { PongTabs },
	data() {
		return { val: 'first', options };
	},
	template: `
		<div style="width: 40%; min-width: var(--spacing--xl); display: flex; flex-direction: column; gap: var(--spacing--xl);">
			<pong-tabs v-model="val" :options="options" />
			<pong-tabs v-model="val" size="small" :options="options" />
			<pong-tabs v-model="val" variant="modern" :options="options" />
			<pong-tabs v-model="val" variant="modern" size="small" :options="options" />
		</div>
	`,
});

export const OversizedTab: StoryFn = () => ({
	components: { PongTabs },
	data() {
		return {
			val: 'wide',
			options: [
				{
					value: 'wide',
					label:
						'A very long tab label that is wider than its container and needs several scroll steps to read',
					tag: '2',
				},
			],
		};
	},
	template: `
		<div style="width: 40%;">
			<pong-tabs v-model="val" :options="options" />
		</div>
	`,
});

export const Justified: StoryFn = () => ({
	components: { PongTabs },
	data() {
		return {
			val: 'first',
			options: [
				{ value: 'first', label: 'A long first tab label', notification: true },
				{ value: 'second', label: 'Second tab' },
				{ value: 'third', label: 'A long third tab label' },
			],
		};
	},
	template: `
		<div style="width: 40%;">
			<pong-tabs v-model="val" justified :options="options" />
		</div>
	`,
});

export const Sizes: StoryFn = () => ({
	components: { PongTabs },
	data() {
		return {
			val: 'first',
			options,
		};
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 24px;">
			<pong-tabs v-model="val" size="medium" :options="options" />
			<pong-tabs v-model="val" size="small" :options="options" />
			<pong-tabs v-model="val" variant="modern" size="medium" :options="options" />
			<pong-tabs v-model="val" variant="modern" size="small" :options="options" />
		</div>
	`,
});
