import { render, screen } from '@testing-library/vue';
import { h } from 'vue';

import PongSettingsRowGroup from './SettingsRowGroup.vue';
import PongSettingsRow from '../PongSettingsRow/SettingsRow.vue';

describe('PongSettingsRowGroup', () => {
	it('renders as a card container with its slotted rows', () => {
		render(PongSettingsRowGroup, {
			slots: { default: '<div data-test-id="row">row</div>' },
		});

		expect(screen.getByTestId('settings-row-group')).toBeInTheDocument();
		expect(screen.getByTestId('row')).toBeInTheDocument();
	});

	it('renders the requested tag', () => {
		render(PongSettingsRowGroup, {
			props: { tag: 'section' },
			slots: { default: 'content' },
		});

		expect(screen.getByTestId('settings-row-group').tagName).toBe('SECTION');
	});

	it('keeps a divider element on every row (last one is hidden via CSS)', () => {
		const { container } = render({
			components: { PongSettingsRowGroup, PongSettingsRow },
			render() {
				return h(PongSettingsRowGroup, null, {
					default: () => [
						h(PongSettingsRow, { title: 'One' }),
						h(PongSettingsRow, { title: 'Two' }),
						h(PongSettingsRow, { title: 'Three' }),
					],
				});
			},
		});

		const dividers = container.querySelectorAll('[data-test-id="settings-row-divider"]');
		expect(dividers).toHaveLength(3);
	});

	it('drops the divider of rows that opt out', () => {
		const { container } = render({
			components: { PongSettingsRowGroup, PongSettingsRow },
			render() {
				return h(PongSettingsRowGroup, null, {
					default: () => [
						h(PongSettingsRow, { title: 'One', showDivider: false }),
						h(PongSettingsRow, { title: 'Two' }),
					],
				});
			},
		});

		const dividers = container.querySelectorAll('[data-test-id="settings-row-divider"]');
		expect(dividers).toHaveLength(1);
	});
});
