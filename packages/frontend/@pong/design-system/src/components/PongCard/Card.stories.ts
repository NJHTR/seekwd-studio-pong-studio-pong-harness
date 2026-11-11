import type { StoryFn } from '@storybook/vue3-vite';

import PongCard from './Card.vue';
import PongButton from '../PongButton/Button.vue';
import PongIcon from '../PongIcon/Icon.vue';
import PongText from '../PongText/Text.vue';

export default {
	title: 'Core/Card',
	component: PongCard,

	parameters: {
		docs: {
			description: {
				component: 'A surface container with consistent padding and styling for grouped content.',
			},
		},
	},
};

export const Default: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongCard,
	},
	template: '<pong-card v-bind="args">This is a card.</pong-card>',
});

export const Hoverable: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongCard,
		PongIcon,
		PongText,
	},
	template: `<div style="width: 140px; text-align: center;">
		<pong-card v-bind="args">
			<pong-icon icon="plus" size="xlarge" />
			<pong-text size="large" class="mt-2xs">Add</pong-text>
		</pong-card>
	</div>`,
});

Hoverable.args = {
	hoverable: true,
};

export const WithSlots: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		PongCard,
		PongButton,
		PongIcon,
		PongText,
	},
	template: `<pong-card v-bind="args">
		<template #prepend>
			<pong-icon icon="check" size="large" />
		</template>
		<template #header>
			<strong>Card header</strong>
		</template>
		<pong-text color="text-light" size="medium" class="mt-2xs mb-2xs">
			This is the card body.
		</pong-text>
		<template #footer>
			<pong-text size="medium">
				Card footer
			</pong-text>
		</template>
		<template #append>
			<pong-button>Click me</pong-button>
		</template>
	</pong-card>`,
});
