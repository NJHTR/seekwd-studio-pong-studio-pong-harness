import { render } from '@testing-library/vue';

import PongStatusDot from './StatusDot.vue';

describe('components/PongStatusDot', () => {
	it('should render success variant without pulse by default', () => {
		const wrapper = render(PongStatusDot);
		const dot = wrapper.container.firstElementChild;
		expect(dot?.className).toContain('success');
		expect(dot?.className).not.toContain('pulse');
		expect(dot?.className).not.toContain('outline');
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should be hidden from assistive technology', () => {
		const wrapper = render(PongStatusDot);
		expect(wrapper.container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
	});

	it.each(['success', 'warning', 'danger', 'neutral'] as const)(
		'should render %s variant class',
		(variant) => {
			const wrapper = render(PongStatusDot, {
				props: { variant },
			});
			expect(wrapper.container.firstElementChild?.className).toContain(variant);
		},
	);

	it.each(['success', 'warning', 'danger', 'neutral'] as const)(
		'should render an outline ring for %s',
		(variant) => {
			const wrapper = render(PongStatusDot, {
				props: { variant, appearance: 'outline' },
			});
			const dot = wrapper.container.firstElementChild;
			expect(dot?.className).toContain(variant);
			expect(dot?.className).toContain('outline');
		},
	);

	it.each(['success', 'warning', 'danger', 'neutral'] as const)(
		'should render a pulse for %s',
		(variant) => {
			const wrapper = render(PongStatusDot, {
				props: { variant, pulse: true },
			});
			const dot = wrapper.container.firstElementChild;
			expect(dot?.className).toContain(variant);
			expect(dot?.className).toContain('pulse');
		},
	);

	it.each(['success', 'warning', 'danger', 'neutral'] as const)(
		'should keep an outline ring still when pulse is set for %s',
		(variant) => {
			const wrapper = render(PongStatusDot, {
				props: { variant, appearance: 'outline', pulse: true },
			});
			const dot = wrapper.container.firstElementChild;
			expect(dot?.className).toContain(variant);
			expect(dot?.className).toContain('outline');
			expect(dot?.className).not.toContain('pulse');
		},
	);
});
