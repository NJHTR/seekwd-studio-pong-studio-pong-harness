import { render } from '@testing-library/vue';

import UserStack from './UserStack.vue';
import { PongAvatar, PongUserInfo } from '../index';

describe('UserStack', () => {
	it('should render flat user list', () => {
		const { container } = render(UserStack, {
			props: {
				currentUserEmail: 'hello@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
				users: {
					Owners: [
						{
							id: '1',
							firstName: 'Sunny',
							lastName: 'Side',
							fullName: 'Sunny Side',
							email: 'hello@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
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
							isPendingUser: false,
							isOwner: false,
							signInType: 'ldap',
							disabled: true,
						},
					],
				},
			},
			global: {
				components: {
					'pong-avatar': PongAvatar,
					'pong-user-info': PongUserInfo,
				},
			},
		});
		expect(container.querySelector('.user-stack')).toBeInTheDocument();
		expect(container.querySelectorAll('svg')).toHaveLength(2);
	});

	it('should not show all avatars', async () => {
		const { container } = render(UserStack, {
			props: {
				currentUserEmail: 'hello@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
				users: {
					Owners: [
						{
							id: '1',
							firstName: 'Sunny',
							lastName: 'Side',
							fullName: 'Sunny Side',
							email: 'hello@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
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
							isPendingUser: false,
							isOwner: false,
							signInType: 'ldap',
							disabled: true,
						},
						{
							id: '3',
							firstName: 'John',
							lastName: 'Doe',
							fullName: 'John Doe',
							email: 'john@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
							isPendingUser: false,
							isOwner: false,
							signInType: 'email',
							disabled: false,
						},
						{
							id: '4',
							firstName: 'Jane',
							lastName: 'Doe',
							fullName: 'Jane Doe',
							email: 'jane@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
							isPendingUser: false,
							isOwner: false,
							signInType: 'ldap',
							disabled: true,
						},
					],
				},
			},
			global: {
				components: {
					'pong-avatar': PongAvatar,
					'pong-user-info': PongUserInfo,
				},
			},
		});
		expect(container.querySelector('.user-stack')).toBeInTheDocument();
		expect(container.querySelectorAll('svg')).toHaveLength(2);
		expect(container.querySelector('.hiddenBadge')).toHaveTextContent('+2');
	});
});
