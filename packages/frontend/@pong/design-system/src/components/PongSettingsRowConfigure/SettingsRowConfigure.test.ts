import { render, screen } from '@testing-library/vue';

import PongSettingsRowConfigure from './SettingsRowConfigure.vue';

describe('PongSettingsRowConfigure', () => {
	it('defaults to the "Configure" label with a trailing chevron (not a button)', () => {
		const { container } = render(PongSettingsRowConfigure);

		const affordance = screen.getByTestId('settings-row-configure');
		expect(affordance).toHaveTextContent('Configure');
		expect(container.querySelector('button')).not.toBeInTheDocument();
		expect(container.querySelector('[data-icon="chevron-right"]')).toBeInTheDocument();
	});

	it('replaces the label with the configured-state text when a value is provided', () => {
		render(PongSettingsRowConfigure, { props: { value: '2 of 3 devices' } });

		const affordance = screen.getByTestId('settings-row-configure');
		expect(affordance).toHaveTextContent('2 of 3 devices');
		expect(affordance).not.toHaveTextContent('Configure');
	});

	it('always renders the trailing chevron', () => {
		const { container } = render(PongSettingsRowConfigure, { props: { value: 'Enabled' } });

		expect(container.querySelector('[data-icon="chevron-right"]')).toBeInTheDocument();
	});
});
