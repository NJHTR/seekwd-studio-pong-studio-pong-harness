import { render, screen } from '@testing-library/vue';

import PongSectionHeader from './SectionHeader.vue';

describe('PongSectionHeader', () => {
	it('renders title correctly', () => {
		render(PongSectionHeader, {
			props: {
				title: 'Test Section',
			},
		});

		expect(screen.getByText('Test Section')).toBeInTheDocument();
		expect(screen.getByTestId('section-header-title')).toBeInTheDocument();
	});

	it('renders without border by default', () => {
		const { container } = render(PongSectionHeader, {
			props: {
				title: 'Test Section',
			},
		});

		const header = container.querySelector('[class*="header"]');
		expect(header?.className).not.toContain('bordered');
	});

	it('renders with border when bordered prop is true', () => {
		const { container } = render(PongSectionHeader, {
			props: {
				title: 'Test Section',
				bordered: true,
			},
		});

		const header = container.querySelector('[class*="header"]');
		expect(header?.className).toContain('bordered');
	});

	it('renders actions slot content', () => {
		render(PongSectionHeader, {
			props: {
				title: 'Test Section',
			},
			slots: {
				actions: '<button data-test-id="custom-action">Action Button</button>',
			},
		});

		expect(screen.getByTestId('custom-action')).toBeInTheDocument();
		expect(screen.getByText('Action Button')).toBeInTheDocument();
	});

	it('does not render actions slot when not provided', () => {
		const { container } = render(PongSectionHeader, {
			props: {
				title: 'Test Section',
			},
		});

		const actionsContainer = container.querySelector('[class*="actions"]');
		expect(actionsContainer).not.toBeInTheDocument();
	});
});
