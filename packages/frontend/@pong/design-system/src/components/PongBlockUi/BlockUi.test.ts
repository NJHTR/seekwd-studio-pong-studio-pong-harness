import { render, screen } from '@testing-library/vue';

import PongBlockUi from './BlockUi.vue';

describe('components', () => {
	describe('PongBlockUi', () => {
		it('should render but not visible', () => {
			render(PongBlockUi);
			expect(screen.queryByRole('dialog', { hidden: true })).not.toBeVisible();
		});

		it('should render and is visible', () => {
			render(PongBlockUi, { props: { show: true } });
			expect(screen.getByRole('dialog', { hidden: true })).toBeVisible();
		});
	});
});
