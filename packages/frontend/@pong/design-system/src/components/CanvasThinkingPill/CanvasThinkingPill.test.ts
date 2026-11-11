import { render } from '@testing-library/vue';

import PongCanvasThinkingPill from './CanvasThinkingPill.vue';

describe('PongCanvasThinkingPill', () => {
	it('renders canvas thinking pill correctly', () => {
		const { container } = render(PongCanvasThinkingPill, {});
		expect(container).toMatchSnapshot();
	});
});
