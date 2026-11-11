import { render } from '@testing-library/vue';

import PongCallout from './Callout.vue';

describe('components', () => {
	describe('PongCallout', () => {
		it('should render info theme correctly', () => {
			const wrapper = render(PongCallout, {
				props: {
					theme: 'info',
				},
				global: {
					stubs: ['PongIcon', 'PongText'],
				},
				slots: {
					default: '<pong-text size="small">This is an info callout.</pong-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render success theme correctly', () => {
			const wrapper = render(PongCallout, {
				props: {
					theme: 'success',
				},
				global: {
					stubs: ['PongIcon', 'PongText'],
				},
				slots: {
					default: '<pong-text size="small">This is a success callout.</pong-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render warning theme correctly', () => {
			const wrapper = render(PongCallout, {
				props: {
					theme: 'warning',
				},
				global: {
					stubs: ['PongIcon', 'PongText'],
				},
				slots: {
					default: '<pong-text size="small">This is a warning callout.</pong-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render danger theme correctly', () => {
			const wrapper = render(PongCallout, {
				props: {
					theme: 'danger',
				},
				global: {
					stubs: ['PongIcon', 'PongText'],
				},
				slots: {
					default: '<pong-text size="small">This is a danger callout.</pong-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render secondary theme correctly', () => {
			const wrapper = render(PongCallout, {
				props: {
					theme: 'secondary',
				},
				global: {
					stubs: ['PongIcon', 'PongText'],
				},
				slots: {
					default: '<pong-text size="small">This is a secondary callout.</pong-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render custom theme correctly', () => {
			const wrapper = render(PongCallout, {
				props: {
					theme: 'custom',
					icon: 'git-branch',
				},
				global: {
					stubs: ['PongIcon', 'PongText'],
				},
				slots: {
					default: '<pong-text size="small">This is a secondary callout.</pong-text>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should wrap icon in a tooltip when iconTooltip is provided', () => {
			const wrapper = render(PongCallout, {
				props: {
					theme: 'custom',
					icon: 'info',
					iconTooltip: 'Useful explanation',
				},
				global: {
					stubs: {
						PongIcon: true,
						PongText: true,
						PongTooltip: {
							template: '<div data-test-id="icon-tooltip" :data-content="content"><slot /></div>',
							props: ['content'],
						},
					},
				},
				slots: {
					default: '<pong-text size="small">This is a callout with an icon tooltip.</pong-text>',
				},
			});
			const tooltip = wrapper.container.querySelector('[data-test-id="icon-tooltip"]');
			expect(tooltip).toBeTruthy();
			expect(tooltip?.getAttribute('data-content')).toBe('Useful explanation');
			expect(tooltip?.querySelector('pong-icon-stub')).toBeTruthy();
		});
		it('should not render a tooltip when iconTooltip is not provided', () => {
			const wrapper = render(PongCallout, {
				props: {
					theme: 'info',
				},
				global: {
					stubs: ['PongIcon', 'PongText', 'PongTooltip'],
				},
				slots: {
					default: '<pong-text size="small">This is an info callout.</pong-text>',
				},
			});
			expect(wrapper.container.querySelector('pong-tooltip-stub')).toBeFalsy();
		});
		it('should render additional slots correctly', () => {
			const wrapper = render(PongCallout, {
				props: {
					theme: 'custom',
					icon: 'git-branch',
				},
				global: {
					stubs: ['PongIcon', 'PongText', 'PongLink'],
				},
				slots: {
					default: '<pong-text size="small">This is a secondary callout.</pong-text>',
					actions: '<pong-link size="small">Do something!</pong-link>',
					trailingContent:
						'<pong-link theme="secondary" size="small" :bold="true" :underline="true" to="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">Learn more</pong-link>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
	});
});
