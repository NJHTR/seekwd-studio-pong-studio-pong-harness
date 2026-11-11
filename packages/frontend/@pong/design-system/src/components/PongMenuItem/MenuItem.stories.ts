import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import PongMenuItem from './MenuItem.vue';
import type { IMenuItem } from '../../types';

const meta = {
	title: 'Core/MenuItem',
	component: PongMenuItem,
	argTypes: {
		active: { control: 'boolean' },
		compact: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A navigation menu item used in sidebars and menus. Supports icons, badges, disabled state, and compact (icon-only) mode.',
			},
			source: { type: 'dynamic' },
		},
	},
	decorators: [
		() => ({
			template: '<div style="width: var(--spacing--5xl);"><story /></div>',
		}),
	],
} satisfies Meta<typeof PongMenuItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseItem: IMenuItem = {
	id: 'workflows',
	label: 'Workflows',
	icon: 'workflow',
};

export const Default: Story = {
	render: (args) => ({
		components: { PongMenuItem },
		setup() {
			return { args, onClick: action('click') };
		},
		template: '<PongMenuItem v-bind="args" @click="onClick" />',
	}),
	args: {
		item: baseItem,
		active: false,
		compact: false,
	},
};

export const Active: Story = {
	render: (args) => ({
		components: { PongMenuItem },
		setup() {
			return { args };
		},
		template: '<PongMenuItem v-bind="args" />',
	}),
	args: {
		item: baseItem,
		active: true,
	},
};

export const WithBadges: Story = {
	render: () => ({
		components: { PongMenuItem },
		setup() {
			const items: IMenuItem[] = [
				{ id: 'new', label: 'AI Agents', icon: 'bot', new: true },
				{ id: 'preview', label: 'Insights', icon: 'chart-column-decreasing', preview: true },
				{
					id: 'notification',
					label: 'Updates',
					icon: 'bell',
					notification: true,
				},
				{
					id: 'credits',
					label: 'Gateway credits',
					icon: 'sparkles',
					creditsTag: '120 left',
				},
			];
			return { items };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs);">
				<PongMenuItem v-for="item in items" :key="item.id" :item="item" />
			</div>
		`,
	}),
	args: {
		item: baseItem,
	},
};

export const Disabled: Story = {
	render: (args) => ({
		components: { PongMenuItem },
		setup() {
			return { args };
		},
		template: '<PongMenuItem v-bind="args" />',
	}),
	args: {
		item: {
			id: 'restricted',
			label: 'Enterprise feature',
			icon: 'lock',
			disabled: true,
			disabledReason: 'Upgrade your plan to unlock this feature.',
		} satisfies IMenuItem,
	},
};

export const Compact: Story = {
	render: (args) => ({
		components: { PongMenuItem },
		setup() {
			return { args };
		},
		template: '<PongMenuItem v-bind="args" />',
	}),
	args: {
		item: baseItem,
		compact: true,
	},
	decorators: [
		() => ({
			template: '<div style="width: var(--spacing--2xl);"><story /></div>',
		}),
	],
};

export const WithChildren: Story = {
	render: (args) => ({
		components: { PongMenuItem },
		setup() {
			return { args };
		},
		template: '<PongMenuItem v-bind="args" />',
	}),
	args: {
		item: {
			id: 'settings',
			label: 'Settings',
			icon: 'settings',
			children: [
				{ id: 'general', label: 'General' },
				{ id: 'users', label: 'Users' },
			],
		} satisfies IMenuItem,
	},
};
