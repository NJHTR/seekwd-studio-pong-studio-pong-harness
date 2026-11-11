import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';

import PongBadge from '../PongBadge';
import NewBadge from './NewBadge.vue';

describe('NewBadge', () => {
	it('renders the default label', () => {
		const { getByText } = render(NewBadge);
		expect(getByText('New')).toBeVisible();
	});

	it('renders custom text', () => {
		const { getByText } = render(NewBadge, { props: { text: 'Recently added' } });
		expect(getByText('Recently added')).toBeVisible();
	});

	it('uses the primary variant and forwards its size', () => {
		const wrapper = mount(NewBadge, { props: { size: 'small' } });
		expect(wrapper.getComponent(PongBadge).props()).toMatchObject({
			variant: 'primary',
			size: 'small',
		});
	});
});
