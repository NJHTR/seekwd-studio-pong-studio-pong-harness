import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongUsersList from './UsersList.vue';
import type { IUser } from '../../types';

export default {
	title: 'Core/UsersList',
	component: PongUsersList,
	argTypes: {},
	parameters: {
		docs: {
			description: {
				component: 'A list layout for showing multiple users with associated metadata.',
			},
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	action: ({ action: actionName }: { action: string; userId: string }) => action(actionName),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongUsersList,
	},
	template: '<pong-users-list v-bind="args" :actions="actions" @action="action" />',
	methods,
});

export const Default = Template.bind({});
Default.args = {
	actions: [
		{
			label: 'Resend Invite',
			value: 'reinvite',
			guard: (user: IUser) => !user.firstName,
		},
		{
			label: 'Delete User',
			value: 'delete',
		},
	],
	users: [
		{
			id: '1',
			firstName: 'Sunny',
			lastName: 'Side',
			fullName: 'Sunny Side',
			email: 'sunny@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			isDefaultUser: false,
			isPendingUser: false,
			isOwner: true,
			signInType: 'email',
			disabled: false,
		},
		{
			id: '2',
			firstName: 'Kobi',
			lastName: 'Dog',
			fullName: 'Kobi Dog',
			email: 'kobi@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			isDefaultUser: false,
			isPendingUser: false,
			isOwner: false,
			signInType: 'ldap',
			disabled: true,
		},
		{
			id: '3',
			email: 'invited@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			isDefaultUser: false,
			isPendingUser: true,
			isOwner: false,
		},
	],
	currentUserId: '1',
};
