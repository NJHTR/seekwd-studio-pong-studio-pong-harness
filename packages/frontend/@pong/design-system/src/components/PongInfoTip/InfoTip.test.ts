import { render } from '@testing-library/vue';

import PongInfoTip from './InfoTip.vue';

const slots = {
	default: ['Need help doing something?', '<a href="/docs" target="_blank">Open docs</a>'],
};
const stubs = ['PongTooltip', 'PongIcon'];

describe('PongInfoTip', () => {
	it('should render correctly as note', () => {
		const wrapper = render(PongInfoTip, {
			slots,
			global: {
				stubs,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly as tooltip', () => {
		const wrapper = render(PongInfoTip, {
			slots,
			props: {
				type: 'tooltip',
			},
			global: {
				stubs,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render correctly with a specific size', () => {
		const wrapper = render(PongInfoTip, {
			slots,
			props: {
				size: 'large',
			},
			global: {
				stubs,
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
