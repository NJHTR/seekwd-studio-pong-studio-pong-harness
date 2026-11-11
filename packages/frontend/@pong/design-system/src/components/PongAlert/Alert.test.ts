import { render, screen } from '@testing-library/vue';

import PongAlert from './Alert.vue';

describe('components', () => {
	describe('PongAlert', () => {
		it('should render with props', () => {
			render(PongAlert, {
				props: { title: 'Title', description: 'Message' },
			});
			expect(screen.getByRole('alert')).toBeVisible();
			expect(screen.getByText('Title')).toBeVisible();
			expect(screen.getByText('Message')).toBeVisible();
		});

		it('should render slots instead of props', () => {
			const { container } = render(PongAlert, {
				props: { showIcon: false },
				slots: {
					title: 'Title',
					default: 'Message',
					aside: '<button>Click me</button>',
					icon: '<pong-icon icon="circle-plus" />',
				},
				global: {
					components: {
						PongIcon: {
							template: '<span class="pong-icon" />',
							props: ['icon'],
						},
					},
				},
			});
			expect(screen.getByRole('alert')).toBeVisible();
			expect(screen.getByText('Title')).toBeVisible();
			expect(screen.getByText('Message')).toBeVisible();
			expect(screen.getByRole('button')).toBeVisible();
			expect(container.querySelector('.pong-icon')).toBeInTheDocument();
		});
	});
});
