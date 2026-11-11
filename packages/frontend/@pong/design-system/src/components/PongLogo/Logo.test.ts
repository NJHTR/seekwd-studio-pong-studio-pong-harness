import { render } from '@testing-library/vue';

import Logo from './Logo.vue';

describe('Logo', () => {
	it('renders the mascot and wordmark for the large variant', () => {
		const { getByAltText, getByText } = render(Logo, { props: { size: 'large' } });

		expect(getByAltText('Pong Studio')).toBeInTheDocument();
		expect(getByText('Pong Studio')).toBeInTheDocument();
	});

	it('hides the wordmark when the sidebar is collapsed', () => {
		const { queryByText, getByAltText } = render(Logo, {
			props: { size: 'small', collapsed: true },
		});

		expect(getByAltText('Pong Studio')).toBeInTheDocument();
		expect(queryByText('Pong Studio')).not.toBeInTheDocument();
	});

	it('shows the wordmark in the expanded sidebar', () => {
		const { getByText } = render(Logo, { props: { size: 'small', collapsed: false } });

		expect(getByText('Pong Studio')).toBeInTheDocument();
	});
});
