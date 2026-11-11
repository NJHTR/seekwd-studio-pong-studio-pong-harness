import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';

import PongToggle from './Toggle.vue';
import PongToggleGroup from '../PongToggleGroup/ToggleGroup.vue';

const tooltipStub = {
	template: '<span data-test-id="tooltip" :data-content="content"><slot /></span>',
	props: ['content'],
};

describe('components/PongToggle', () => {
	it('renders an icon-only button with the label as accessible name and tooltip content', () => {
		const wrapper = render(PongToggle, {
			props: { label: 'Bold', icon: 'text' },
			global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
		});

		const toggle = wrapper.getByRole('button', { name: 'Bold' });
		expect(toggle).toBeInTheDocument();
		expect(toggle.className).toContain('iconOnly');
		expect(wrapper.getByTestId('tooltip')).toHaveAttribute('data-content', 'Bold');
	});

	it.each(['solid', 'brand', 'ghost', 'outline', 'destructive', 'success'] as const)(
		'renders %s variant like PongButton',
		(variant) => {
			const wrapper = render(PongToggle, {
				props: { label: 'Align left', icon: 'align-right', variant },
				global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
			});

			expect(wrapper.getByRole('button').className).toContain(variant);
		},
	);

	it.each(['xsmall', 'small', 'medium', 'large', 'xlarge'] as const)(
		'renders %s size like PongButton',
		(size) => {
			const wrapper = render(PongToggle, {
				props: { label: 'Align left', icon: 'align-right', size },
				global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
			});

			expect(wrapper.getByRole('button').className).toContain(size);
		},
	);

	it('supports controlled pressed state', async () => {
		const onUpdate = vi.fn();
		const wrapper = render(PongToggle, {
			props: { label: 'Italic', modelValue: false, 'onUpdate:modelValue': onUpdate },
			slots: { default: '<span>I</span>' },
			global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
		});

		const toggle = wrapper.getByRole('button', { name: 'Italic' });
		await userEvent.click(toggle);

		expect(onUpdate).toHaveBeenCalledWith(true);
		expect(toggle).toHaveAttribute('data-state', 'off');
	});

	it('renders pressed state from modelValue', () => {
		const wrapper = render(PongToggle, {
			props: { label: 'Underline', modelValue: true },
			slots: { default: '<span>U</span>' },
			global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
		});

		expect(wrapper.getByRole('button')).toHaveAttribute('data-state', 'on');
	});

	it('treats null modelValue as unpressed when reset from a pressed state', async () => {
		const wrapper = render(PongToggle, {
			props: { label: 'Underline', modelValue: true },
			slots: { default: '<span>U</span>' },
			global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
		});

		const toggle = wrapper.getByRole('button');
		expect(toggle).toHaveAttribute('data-state', 'on');

		await wrapper.rerender({ modelValue: null });

		expect(toggle).toHaveAttribute('data-state', 'off');
	});

	it('can be used inside PongToggleGroup as a single-selection item', async () => {
		const TestComponent = defineComponent({
			components: { PongToggleGroup, PongToggle },
			setup() {
				const value = ref('left');
				return { value };
			},
			template: `
				<PongToggleGroup v-model="value">
					<PongToggle value="left" label="Align left">L</PongToggle>
					<PongToggle value="center" label="Align center">C</PongToggle>
				</PongToggleGroup>
			`,
		});

		const wrapper = render(TestComponent, {
			global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
		});

		expect(wrapper.getByRole('button', { name: 'Align left' })).toHaveAttribute('data-state', 'on');

		await userEvent.click(wrapper.getByRole('button', { name: 'Align center' }));

		expect(wrapper.getByRole('button', { name: 'Align center' })).toHaveAttribute(
			'data-state',
			'on',
		);
	});

	it('can be used inside PongToggleGroup as a multiple-selection item', async () => {
		const TestComponent = defineComponent({
			components: { PongToggleGroup, PongToggle },
			setup() {
				const value = ref(['bold']);
				return { value };
			},
			template: `
				<PongToggleGroup v-model="value" type="multiple">
					<PongToggle value="bold" label="Bold">B</PongToggle>
					<PongToggle value="italic" label="Italic">I</PongToggle>
				</PongToggleGroup>
			`,
		});

		const wrapper = render(TestComponent, {
			global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
		});

		await userEvent.click(wrapper.getByRole('button', { name: 'Italic' }));

		expect(wrapper.getByRole('button', { name: 'Bold' })).toHaveAttribute('data-state', 'on');
		expect(wrapper.getByRole('button', { name: 'Italic' })).toHaveAttribute('data-state', 'on');
	});

	it('does not emit updates when disabled', async () => {
		const onUpdate = vi.fn();
		const wrapper = render(PongToggle, {
			props: { label: 'Disabled', disabled: true, 'onUpdate:modelValue': onUpdate },
			slots: { default: '<span>D</span>' },
			global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
		});

		const toggle = wrapper.getByRole('button', { name: 'Disabled' });
		expect(toggle).toBeDisabled();

		await userEvent.click(toggle);
		expect(onUpdate).not.toHaveBeenCalled();
	});

	it('passes disabled state from PongToggleGroup slot props to child toggles', () => {
		const TestComponent = defineComponent({
			components: { PongToggleGroup, PongToggle },
			template: `
				<PongToggleGroup disabled>
					<template #default="slotProps">
						<PongToggle value="left" label="Align left" v-bind="slotProps">L</PongToggle>
					</template>
				</PongToggleGroup>
			`,
		});

		const wrapper = render(TestComponent, {
			global: { stubs: { PongTooltip: tooltipStub, PongIcon: true } },
		});

		expect(wrapper.getByRole('button', { name: 'Align left' })).toBeDisabled();
	});
});
