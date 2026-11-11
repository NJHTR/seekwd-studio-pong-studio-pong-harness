import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongVisuallyHidden from './VisuallyHidden.vue';

const meta: Meta<typeof PongVisuallyHidden> = {
	title: 'Core/VisuallyHidden',
	component: PongVisuallyHidden,
	parameters: {
		docs: {
			description: {
				component: 'Hides content visually and keeps it available to screen readers.',
			},
		},
	},
};

export default meta;

type Story = StoryObj<typeof PongVisuallyHidden>;

export const HiddenHeading: Story = {
	args: { asChild: true },
	render: function renderHiddenHeading(args) {
		return {
			components: { PongVisuallyHidden },
			setup: function setup() {
				return { args };
			},
			template: `
				<section aria-labelledby="hidden-heading">
					<PongVisuallyHidden v-bind="args">
						<h3 id="hidden-heading">Settings</h3>
					</PongVisuallyHidden>
					<p>The section heading is available to screen readers.</p>
				</section>
			`,
		};
	},
};
