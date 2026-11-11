import type { StoryFn } from '@storybook/vue3-vite';
import type { Component } from 'vue';
import { ref } from 'vue';

import PongSelectableList from './SelectableList.vue';

export default {
	title: 'Core/SelectableList',
	component: PongSelectableList,
	argTypes: {},
	parameters: {
		docs: {
			description: { component: 'A list component with keyboard and pointer selection behavior.' },
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const Template: StoryFn = (args) => ({
	setup: () => {
		const model = ref(args.modelValue);
		return { args, model };
	},
	components: {
		PongSelectableList: PongSelectableList as unknown as Component,
	},
	template:
		'<pong-selectable-list v-bind="args" v-model="model"><template #displayItem="{ name }">Slot content for {{name}}</template></pong-selectable-list>',
});

export const Default = Template.bind({});
Default.args = {
	modelValue: {
		propC: 'propC pre-existing initial value',
	},
	inputs: [
		{
			name: 'propC',
			initialValue: 'propC default',
		},
		{
			name: 'propB',
			initialValue: 0,
		},
		{
			name: 'propA',
			initialValue: false,
		},
	],
};
