import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';

import PongSelect from './Select.vue';
import { removeDynamicAttributes } from '../../utils';
import { insideDialogBodyKey } from '../PongDialog/dialogContext';
import PongOption from '../PongOption/Option.vue';

describe('components', () => {
	describe('PongSelect', () => {
		it('should render correctly', () => {
			const wrapper = render(PongSelect, {
				global: {
					components: {
						'pong-option': PongOption,
					},
				},
				slots: {
					default: [
						'<pong-option value="1">1</pong-option>',
						'<pong-option value="2">2</pong-option>',
						'<pong-option value="3">3</pong-option>',
					],
				},
			});
			removeDynamicAttributes(wrapper.container);
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should update and remove ARIA attributes on the native combobox', async () => {
			const host = defineComponent({
				components: { PongSelect },
				props: { controlAttrs: Object },
				template: '<PongSelect id="project" filterable :teleported="false" v-bind="controlAttrs" />',
			});
			const { getByRole, rerender } = render(host, {
				props: {
					controlAttrs: {
						'aria-invalid': true,
						'aria-describedby': 'project-error',
						'aria-busy': true,
					},
				},
			});
			const input = getByRole('combobox');
			expect(input.tagName).toBe('INPUT');
			await waitFor(() => expect(input).toHaveAttribute('id', 'project'));
			expect(input).toHaveAttribute('aria-invalid', 'true');
			expect(input).toHaveAttribute('aria-describedby', 'project-error');
			expect(input).toHaveAttribute('aria-busy', 'true');

			await rerender({
				controlAttrs: {
					'aria-invalid': false,
					'aria-describedby': 'project-help',
					'aria-busy': false,
				},
			});
			expect(input).toHaveAttribute('aria-invalid', 'false');
			expect(input).toHaveAttribute('aria-describedby', 'project-help');
			expect(input).toHaveAttribute('aria-busy', 'false');

			await rerender({ controlAttrs: { 'aria-invalid': undefined, 'aria-describedby': null } });
			expect(input).not.toHaveAttribute('aria-invalid');
			expect(input).not.toHaveAttribute('aria-describedby');
			expect(input).not.toHaveAttribute('aria-busy');
		});

		it('should select an option', async () => {
			const pongSelectTestComponent = defineComponent({
				props: {
					teleported: Boolean,
				},
				setup() {
					const options = ref(['1', '2', '3']);
					const selected = ref('');

					return {
						options,
						selected,
					};
				},
				template: `
					<pong-select v-model="selected" :teleported="teleported">
						<pong-option v-for="o in options" :key="o" :value="o" :label="o" />
					</pong-select>
				`,
			});

			const { container } = render(pongSelectTestComponent, {
				props: {
					teleported: false,
				},
				global: {
					components: {
						'pong-select': PongSelect,
						'pong-option': PongOption,
					},
				},
			});
			const getOption = (value: string) => within(container as HTMLElement).getByText(value);

			const textbox = container.querySelector('input')!;
			await userEvent.click(textbox);
			await waitFor(() => expect(getOption('1')).toBeVisible());
			await userEvent.click(getOption('1'));

			expect(textbox).toHaveValue('1');
		});

		it.each([
			{ insideDialogBody: true, teleported: false, popperOptions: undefined, position: 'fixed' },
			{
				insideDialogBody: false,
				teleported: false,
				popperOptions: undefined,
				position: 'absolute',
			},
			{ insideDialogBody: true, teleported: true, popperOptions: undefined, position: 'absolute' },
			{
				insideDialogBody: true,
				teleported: false,
				popperOptions: { strategy: 'absolute' as const },
				position: 'absolute',
			},
		])(
			'should position the dropdown as $position when inside dialog body is $insideDialogBody, teleported is $teleported and popperOptions is $popperOptions',
			async ({ insideDialogBody, teleported, popperOptions, position }) => {
				const { container } = render(PongSelect, {
					props: { teleported, popperOptions },
					global: {
						components: { 'pong-option': PongOption },
						provide: { [insideDialogBodyKey]: insideDialogBody },
					},
					slots: { default: '<pong-option value="1" label="1" />' },
				});

				await userEvent.click(container.querySelector('input')!);

				await waitFor(() =>
					expect(document.querySelector<HTMLElement>('.el-select__popper')?.style.position).toBe(
						position,
					),
				);
			},
		);
	});
});
