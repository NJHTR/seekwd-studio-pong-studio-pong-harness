import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongUserSelect from './UserSelect.vue';

export default {
	title: 'Core/UserSelect',
	component: PongUserSelect,
	argTypes: {},
	parameters: {
		docs: {
			description: { component: 'A user picker for selecting one or more users from a list.' },
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onChange: action('change'),
	onBlur: action('blur'),
	onFocus: action('focus'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongUserSelect,
	},
	template:
		'<pong-user-select v-bind="args" v-model="val" @change="onChange" @blur="onBlur" @focus="onFocus" />',
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const Default = Template.bind({});
Default.args = {
	users: [
		{
			id: '1',
			firstName: 'Sunny',
			lastName: 'Side',
			email: 'sunny@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		},
		{
			id: '2',
			firstName: 'Kobi',
			lastName: 'Dog',
			email: 'kobi@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		},
		{
			id: '3',
			email: 'invited@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		},
	],
	placeholder: 'Select user to transfer to',
	currentUserId: '1',
};

export const Sizes: StoryFn = () => ({
	components: { PongUserSelect },
	data() {
		return {
			val: '',
			users: Default.args?.users,
		};
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
			<pong-user-select v-model="val" :users="users" size="mini" placeholder="Mini" />
			<pong-user-select v-model="val" :users="users" size="small" placeholder="Small" />
			<pong-user-select v-model="val" :users="users" size="medium" placeholder="Medium" />
			<pong-user-select v-model="val" :users="users" size="large" placeholder="Large" />
		</div>
	`,
});
