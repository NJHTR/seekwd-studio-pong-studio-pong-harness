import { fireEvent, render, screen } from '@testing-library/vue';

import PongSettingsRowButton from './SettingsRowButton.vue';

describe('PongSettingsRowButton', () => {
	it('renders its content and handles clicks', async () => {
		const onClick = vi.fn();
		render(PongSettingsRowButton, {
			attrs: { onClick },
			slots: { default: 'Choose permission' },
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Choose permission' }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	it('is disabled when requested', () => {
		render(PongSettingsRowButton, {
			props: { disabled: true },
			slots: { default: 'Choose permission' },
		});

		const button = screen.getByRole('button', { name: 'Choose permission' });
		expect(button).toBeDisabled();
	});

	it('rotates the chevron when expanded', () => {
		const { container } = render(PongSettingsRowButton, {
			props: { expanded: true },
			slots: { default: 'Choose permission' },
		});

		expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
		expect(container.querySelector('svg')?.className.baseVal).toContain('expanded');
	});
});
