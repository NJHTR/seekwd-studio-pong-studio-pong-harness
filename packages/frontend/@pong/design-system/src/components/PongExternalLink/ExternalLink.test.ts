import { render } from '@testing-library/vue';

import PongExternalLink from './ExternalLink.vue';

const stubs = ['PongIcon'];

describe('components', () => {
	describe('PongExternalLink', () => {
		it('should render correctly with href', () => {
			const wrapper = render(PongExternalLink, {
				props: {
					href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
				},
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render correctly without href', () => {
			const wrapper = render(PongExternalLink, {
				props: {},
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render correctly with slot content', () => {
			const wrapper = render(PongExternalLink, {
				props: { href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' },
				slots: { default: 'Visit pong' },
				global: {
					stubs,
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		describe('props', () => {
			describe('href', () => {
				it('should set href attribute', () => {
					const href = 'https://example.com';
					const wrapper = render(PongExternalLink, {
						props: { href },
						global: { stubs },
					});
					const link = wrapper.getByRole('link');
					expect(link.getAttribute('href')).toBe(href);
				});
			});

			describe('newWindow', () => {
				it('should open in new window by default', () => {
					const wrapper = render(PongExternalLink, {
						props: { href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' },
						global: { stubs },
					});
					const link = wrapper.getByRole('link');
					expect(link.getAttribute('target')).toBe('_blank');
					expect(link.getAttribute('rel')).toBe('noopener noreferrer');
				});

				it('should not open in new window when newWindow is false', () => {
					const wrapper = render(PongExternalLink, {
						props: {
							href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
							newWindow: false,
						},
						global: { stubs },
					});
					const link = wrapper.getByRole('link');
					expect(link.getAttribute('target')).toBeNull();
					expect(link.getAttribute('rel')).toBeNull();
				});
			});

			describe('size', () => {
				it('should pass size prop to icon', () => {
					const wrapper = render(PongExternalLink, {
						props: {
							href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
							size: 'large',
						},
						global: { stubs },
					});
					const iconStub = wrapper.html();
					expect(iconStub).toContain('size="large"');
				});
			});
		});

		describe('element type', () => {
			it('should render as anchor when href is provided', () => {
				const wrapper = render(PongExternalLink, {
					props: { href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' },
					global: { stubs },
				});
				const element = wrapper.getByRole('link');
				expect(element.tagName).toBe('A');
			});

			it('should render as button when href is not provided', () => {
				const wrapper = render(PongExternalLink, {
					props: {},
					global: { stubs },
				});
				const element = wrapper.getByRole('button');
				expect(element.tagName).toBe('BUTTON');
			});
		});

		describe('slot content', () => {
			it('should display slot content before icon', () => {
				const wrapper = render(PongExternalLink, {
					props: { href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' },
					slots: { default: 'Visit pong' },
					global: { stubs },
				});
				const link = wrapper.getByRole('link');
				expect(link).toHaveTextContent('Visit pong');
			});
		});

		describe('styling', () => {
			it('should have base text color initially', () => {
				const wrapper = render(PongExternalLink, {
					props: { href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' },
					global: { stubs },
				});
				const link = wrapper.getByRole('link');
				expect(link).toHaveClass('link');
				expect(link).not.toHaveClass('inline');
			});

			it('should apply the inline treatment when inline is set', () => {
				const wrapper = render(PongExternalLink, {
					props: { href: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness', inline: true },
					slots: { default: 'documentation' },
					global: { stubs },
				});
				const link = wrapper.getByRole('link');
				expect(link).toHaveClass('link');
				expect(link).toHaveClass('inline');
			});
		});
	});
});
