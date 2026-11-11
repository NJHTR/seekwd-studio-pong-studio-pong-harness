import { render } from '@testing-library/vue';

import PongColorPicker from './ColorPicker.vue';

describe('components', () => {
	describe('PongColorPicker', () => {
		it('should render with input', () => {
			const { container } = render(PongColorPicker, {
				props: {
					name: 'color-picker',
				},
			});
			expect(container).toMatchSnapshot();
		});

		it('should render without input', () => {
			const { container } = render(PongColorPicker, {
				props: {
					name: 'color-picker',
					showInput: false,
				},
			});
			expect(container).toMatchSnapshot();
		});
	});
});
