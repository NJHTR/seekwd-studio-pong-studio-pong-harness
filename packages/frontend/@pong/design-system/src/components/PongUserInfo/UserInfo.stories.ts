import type { StoryFn } from '@storybook/vue3-vite';

import PongUserInfo from './UserInfo.vue';

export default {
	title: 'Core/UserInfo',
	component: PongUserInfo,
	parameters: {
		docs: {
			description: {
				component: 'A user identity display combining avatar, name, and supporting details.',
			},
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongUserInfo,
	},
	template: '<pong-user-info v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	firstName: 'Oscar',
	lastName: 'Wilde',
	email: 'test@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
};

export const Current = Template.bind({});
Current.args = {
	firstName: 'Ham',
	lastName: 'Sam',
	email: 'test@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	isCurrentUser: true,
};

export const Invited = Template.bind({});
Invited.args = {
	email: 'test@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	isPendingUser: true,
};

export const WithoutAvatar = Template.bind({});
WithoutAvatar.args = {
	firstName: 'Oscar',
	lastName: 'Wilde',
	email: 'test@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	hideAvatar: true,
};
