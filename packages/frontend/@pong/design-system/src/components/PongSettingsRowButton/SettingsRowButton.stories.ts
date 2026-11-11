import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongText from '../PongText';
import PongSettingsRowButton from './SettingsRowButton.vue';

const meta = {
	title: 'Areas/Settings/SettingsRowButton',
	component: PongSettingsRowButton,
} satisfies Meta<typeof PongSettingsRowButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongSettingsRowButton, PongText },
		setup: () => ({ args }),
		template: `
			<PongSettingsRowButton v-bind="args">
				<PongText size="small" color="text-base">View more</PongText>
			</PongSettingsRowButton>
		`,
	}),
};
