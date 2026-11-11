import { render, screen } from '@testing-library/vue';

import PongBadge from './Badge.vue';

describe('components', function describeComponents() {
	describe('PongBadge', function describePongBadge() {
		describe('props', function describeProps() {
			it('should render with default values correctly', function testDefaultValues() {
				const wrapper = render(PongBadge, {
					slots: {
						default: 'Default badge',
					},
				});

				expect(screen.getByText('Default badge')).toBeVisible();
				expect(wrapper.container.firstElementChild).toHaveClass('pong-badge');
				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should not render an empty label without a slot', function testNoLabel() {
				const wrapper = render(PongBadge, { props: { leadingIcon: 'arrow-up' } });

				expect(wrapper.container.querySelector('.pong-badge')).toBeInTheDocument();
				expect(wrapper.container.querySelector('.pong-text')).toBeNull();
			});

			it('should render the selected variant and size', function testVariantAndSize() {
				const wrapper = render(PongBadge, {
					props: {
						variant: 'secondary',
						size: 'medium',
					},
					slots: {
						default: 'Secondary badge',
					},
				});

				expect(screen.getByText('Secondary badge')).toBeVisible();
				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should render a button when clickable', function testClickable() {
				const wrapper = render(PongBadge, {
					props: {
						clickable: true,
					},
					slots: {
						default: 'Clickable badge',
					},
				});

				expect(screen.getByRole('button', { name: 'Clickable badge' })).toHaveAttribute(
					'type',
					'button',
				);
				expect(screen.getByRole('button', { name: 'Clickable badge' })).toHaveClass('pong-badge');
				expect(wrapper.html()).toMatchSnapshot();
			});

			it('should apply the icon class when leading and trailing icons are present', function testIconClass() {
				render(PongBadge, {
					props: {
						leadingIcon: 'check',
						trailingIcon: 'x',
					},
					slots: {
						default: 'Badge with icons',
					},
				});

				expect(screen.getByText('Badge with icons')).toHaveClass('hasIcon');
			});
		});
	});
});
