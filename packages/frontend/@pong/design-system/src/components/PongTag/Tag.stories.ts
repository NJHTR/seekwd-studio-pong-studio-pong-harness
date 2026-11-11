import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongTag from './Tag.vue';
import PongTags from '../PongTags/Tags.vue';

const meta = {
	title: 'Core/Tag',
	component: PongTag,
	argTypes: {
		text: {
			control: 'text',
		},
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A compact chip-like component for displaying actionable items in a List or TagsInput.',
			},
		},
	},
} satisfies Meta<typeof PongTag>;

export default meta;
type Story = StoryObj<typeof meta>;
type TagsStory = StoryObj<typeof PongTags>;

export const Default: Story = {
	render: (args) => ({
		components: { PongTag },
		setup() {
			return { args };
		},
		template: '<PongTag v-bind="args" />',
	}),
	args: {
		text: 'tag name',
		size: 'sm',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { PongTag },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<PongTag text="tag name" size="sm" />
				<PongTag text="tag name" size="md" />
				<PongTag text="tag name" size="lg" />
			</div>
		`,
	}),
	args: {
		text: 'tag name',
	},
};

export const TagList: TagsStory = {
	render: (args) => ({
		components: { PongTags },
		setup() {
			return { args };
		},
		template: '<PongTags v-bind="args" />',
	}),
	args: {
		tags: [
			{ id: '1', name: 'very long tag name' },
			{ id: '2', name: 'tag1' },
			{ id: '3', name: 'tag2 yo' },
		],
	},
};

export const TruncatedTagList: TagsStory = {
	render: (args) => ({
		components: { PongTags },
		setup() {
			return { args };
		},
		template: '<PongTags v-bind="args" />',
	}),
	args: {
		truncate: true,
		tags: [
			{ id: '1', name: 'very long tag name' },
			{ id: '2', name: 'tag1' },
			{ id: '3', name: 'tag2 yo' },
			{ id: '4', name: 'tag3' },
			{ id: '5', name: 'tag4' },
		],
	},
};
