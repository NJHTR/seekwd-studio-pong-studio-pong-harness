import { render } from '@testing-library/vue';

import PONGCircleLoader from './CircleLoader.vue';

describe('PONGCircleLoader', () => {
	it('should render correctly', () => {
		const wrapper = render(PONGCircleLoader, {
			props: {
				radius: 20,
				progress: 42,
				strokeWidth: 10,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
