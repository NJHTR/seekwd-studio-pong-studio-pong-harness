import type { StoryFn } from '@storybook/vue3-vite';

import '../../css/_tokens.scss';

import PongChatMessage from './ChatMessage.vue';
import PongIconButton from '../PongIconButton';

export default {
	title: 'Areas/Assistant/ChatMessage',
	component: PongChatMessage,
	argTypes: {
		role: {
			control: 'select',
			options: ['assistant', 'user'],
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A presentational shell for role-based chat message alignment, user bubbles, and optional assistant actions.',
			},
		},
	},
};

const Template: StoryFn = (args) => ({
	components: { PongChatMessage, PongIconButton },
	setup: () => ({ args }),
	template: `
		<div style="width: 500px; max-width: 100%;">
			<PongChatMessage v-bind="args">
				<p style="margin: 0;">Build a workflow that summarizes new support tickets.</p>
				<template v-if="args.role === 'assistant'" #actions>
					<PongIconButton icon="copy" variant="ghost" size="xsmall" aria-label="Copy message" />
				</template>
			</PongChatMessage>
		</div>
	`,
});

export const Default = Template.bind({});
Default.args = { role: 'user' };

export const Variants: StoryFn = () => ({
	components: { PongChatMessage, PongIconButton },
	template: `
		<div style="width: 500px; max-width: 100%; display: flex; flex-direction: column; gap: 12px;">
			<PongChatMessage role="user">
				<p style="margin: 0;">Build a workflow that summarizes new support tickets.</p>
			</PongChatMessage>
			<PongChatMessage role="assistant">
				<p style="margin: 0;">Build a workflow that summarizes new support tickets.</p>
				<template #actions>
					<PongIconButton icon="copy" variant="ghost" size="xsmall" aria-label="Copy message" />
				</template>
			</PongChatMessage>
		</div>
	`,
});

export const Assistant = Template.bind({});
Assistant.args = { role: 'assistant' };
