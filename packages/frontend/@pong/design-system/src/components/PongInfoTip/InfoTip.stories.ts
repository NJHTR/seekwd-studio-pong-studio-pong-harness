import type { StoryFn } from '@storybook/vue3-vite';

import PongInfoTip from './InfoTip.vue';

export default {
	title: 'Core/InfoTip',
	component: PongInfoTip,

	parameters: {
		docs: {
			description: { component: 'An inline helper text element for short contextual guidance.' },
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongInfoTip,
	},
	template:
		'<pong-info-tip v-bind="args">Need help doing something? <a href="/docs" target="_blank">Open docs</a></pong-info-tip>',
});

export const Default = Template.bind({});

export const Variants: StoryFn = () => ({
	components: { PongInfoTip },
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px;">
			<pong-info-tip theme="info">Info tip</pong-info-tip>
			<pong-info-tip theme="info-light">Info light tip</pong-info-tip>
			<pong-info-tip theme="warning">Warning tip</pong-info-tip>
			<pong-info-tip theme="warning-light">Warning light tip</pong-info-tip>
			<pong-info-tip theme="danger">Danger tip</pong-info-tip>
			<pong-info-tip theme="success">Success tip</pong-info-tip>
			<pong-info-tip type="tooltip" tooltip-placement="right">Tooltip tip</pong-info-tip>
		</div>
	`,
});

export const Sizes: StoryFn = () => ({
	components: { PongInfoTip },
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px;">
			<pong-info-tip size="xsmall">XSmall</pong-info-tip>
			<pong-info-tip size="small">Small</pong-info-tip>
			<pong-info-tip size="medium">Medium</pong-info-tip>
			<pong-info-tip size="large">Large</pong-info-tip>
			<pong-info-tip size="xlarge">XLarge</pong-info-tip>
		</div>
	`,
});

export const Tooltip = Template.bind({});
Tooltip.args = {
	type: 'tooltip',
	tooltipPlacement: 'right',
};
