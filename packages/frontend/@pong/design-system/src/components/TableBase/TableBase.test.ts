import { render } from '@testing-library/vue';

import PongTableBase from './TableBase.vue';

describe('PongTableBase', () => {
	it('applies no height cap by default', () => {
		const { getByTestId } = render(PongTableBase, {
			slots: { default: '<tbody><tr><td>row</td></tr></tbody>' },
		});
		expect(getByTestId('table-base-scroll').style.maxHeight).toBe('');
	});

	it('caps the scroll viewport to maxDisplayedRows rows', () => {
		const { getByTestId } = render(PongTableBase, {
			props: { maxDisplayedRows: 10 },
			slots: { default: '<tbody><tr><td>row</td></tr></tbody>' },
		});
		expect(getByTestId('table-base-scroll').style.maxHeight).toBe('490px');
	});

	it('adds the header height on top when a thead is present', () => {
		const { getByTestId } = render(PongTableBase, {
			props: { maxDisplayedRows: 10 },
			slots: {
				default: '<thead><tr><th>Col</th></tr></thead><tbody><tr><td>row</td></tr></tbody>',
			},
		});
		expect(getByTestId('table-base-scroll').style.maxHeight).toBe('527px');
	});
});
