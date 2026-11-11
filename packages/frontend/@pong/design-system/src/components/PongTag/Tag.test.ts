import { render } from '@testing-library/vue';

import PongTag from './Tag.vue';

describe('PongTag', () => {
	it('renders the default sm tag', () => {
		const wrapper = render(PongTag, {
			props: {
				text: 'Tag name',
				clickable: false,
			},
		});

		const tag = wrapper.getByText('Tag name').closest('.pong-tag');

		expect(tag).toBeInTheDocument();
		expect(tag?.className).toContain('sm');
	});

	it.each(['md', 'lg'] as const)('renders the %s tag variant', (size) => {
		const wrapper = render(PongTag, {
			props: {
				text: 'Tag name',
				size,
				clickable: false,
			},
		});

		const tag = wrapper.getByText('Tag name').closest('.pong-tag');

		expect(tag).toBeInTheDocument();
		expect(tag?.className).toContain(size);
	});
});
