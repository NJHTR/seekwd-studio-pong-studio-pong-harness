import type { Meta, StoryObj } from '@storybook/vue3-vite';

import { BADGE_SIZE, BADGE_VARIANT } from './Badge.type';
import PongBadge from './Badge.vue';

const VARIANT_EXAMPLES = [
	{ variant: 'filled', label: 'Draft', icon: 'file' },
	{ variant: 'primary', label: 'New', icon: 'sparkles' },
	{ variant: 'secondary', label: 'AI generated', icon: 'bot' },
	{ variant: 'subtle', label: 'Shared', icon: 'users' },
	{ variant: 'outline', label: 'Archived', icon: 'archive' },
	{ variant: 'ghost', label: 'Optional', icon: 'circle-dashed' },
	{ variant: 'warning', label: 'Needs setup', icon: 'triangle-alert' },
	{ variant: 'danger', label: 'Failed', icon: 'circle-x' },
	{ variant: 'success', label: 'Active', icon: 'circle-check' },
	{ variant: 'info', label: 'Information', icon: 'info' },
] as const;

const ICON_EXAMPLES = [
	{ label: 'Best version', leadingIcon: 'star' },
	{ label: 'Dependency', leadingIcon: 'link' },
	{ label: '3 attachments', leadingIcon: 'paperclip' },
	{ label: 'Open workflow', trailingIcon: 'external-link' },
] as const;

const meta = {
	title: 'Core/Badge',
	component: PongBadge,
	argTypes: {
		variant: {
			control: 'select',
			options: BADGE_VARIANT,
		},
		size: {
			control: 'select',
			options: BADGE_SIZE,
		},
		clickable: {
			control: 'boolean',
		},
		default: { control: 'text' },
	},
	parameters: {
		docs: {
			description: { component: 'A compact status label for highlighting state or metadata.' },
		},
	},
} satisfies Meta<typeof PongBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: function renderBadge(args) {
		return {
			setup: function setup() {
				return { args };
			},
			components: { PongBadge },
			template: '<PongBadge v-bind="args">{{ args.default }}</PongBadge>',
		};
	},
	args: {
		variant: 'filled',
		size: 'small',
		clickable: false,
		default: 'Badge',
	},
};

export const Variants: Story = {
	render: function renderAllVariants() {
		return {
			setup: function setup() {
				return { examples: VARIANT_EXAMPLES };
			},
			components: { PongBadge },
			template: `
				<div style="display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing--sm)">
					<PongBadge
						v-for="example in examples"
						:key="example.variant"
						:variant="example.variant"
						:leading-icon="example.icon"
					>
						{{ example.label }}
					</PongBadge>
				</div>
			`,
		};
	},
};

export const Sizes: Story = {
	render: function renderAllSizes() {
		return {
			setup: function setup() {
				return { sizes: BADGE_SIZE };
			},
			components: { PongBadge },
			template: `
				<div style="display: flex; flex-direction: column; gap: var(--spacing--sm)">
					<div style="display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing--sm)">
						<PongBadge
							v-for="size in sizes"
							:key="size"
							:size="size"
							leading-icon="circle-check"
							variant="success"
						>
							Active
						</PongBadge>
					</div>
					<div style="display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing--sm)">
						<PongBadge
							v-for="size in sizes"
							:key="size + '-text'"
							:size="size"
							variant="success"
						>
							Active
						</PongBadge>
					</div>
				</div>
			`,
		};
	},
};

export const WithIcons: Story = {
	render: function renderWithIcons() {
		return {
			setup: function setup() {
				return { examples: ICON_EXAMPLES };
			},
			components: { PongBadge },
			template: `
				<div style="display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing--sm)">
					<PongBadge
						v-for="example in examples"
						:key="example.label"
						:leading-icon="example.leadingIcon"
						:trailing-icon="example.trailingIcon"
					>
						{{ example.label }}
					</PongBadge>
				</div>
			`,
		};
	},
};

export const Clickable: Story = {
	render: function renderClickable() {
		return {
			components: { PongBadge },
			template: `
				<div style="display: flex; align-items: center; gap: var(--spacing--sm)">
					<PongBadge clickable leading-icon="list-filter">Filter applied</PongBadge>
					<PongBadge clickable disabled leading-icon="lock">Locked</PongBadge>
				</div>
			`,
		};
	},
};
