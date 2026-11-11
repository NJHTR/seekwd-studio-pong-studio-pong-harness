import type { Meta, StoryObj } from '@storybook/vue3-vite';

import PongButton from './Button.vue';
import IconTextButton from '../IconTextButton/IconTextButton.vue';
import PongIcon from '../PongIcon/Icon.vue';
import PongIconButton from '../PongIconButton/IconButton.vue';

const meta = {
	title: 'Core/Button',
	component: PongButton,
	argTypes: {
		variant: {
			control: 'select',
			options: ['solid', 'brand', 'ghost', 'outline', 'destructive', 'success'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
		},
		loading: {
			control: 'boolean',
		},
		disabled: {
			control: 'boolean',
		},
		iconOnly: {
			control: 'boolean',
			description: 'Makes button square (icon-only)',
		},
		href: {
			control: 'text',
			description: 'If provided, renders as a link',
		},
		// Hide internal props from the table
		icon: { table: { disable: true } },
		iconSize: { table: { disable: true } },
		label: { table: { disable: true } },
	},
	parameters: {
		docs: {
			description: {
				component: 'A clickable element that triggers an action in multiple variants and sizes.',
			},
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof PongButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { PongButton },
		setup() {
			return { args };
		},
		template: `
			<PongButton v-bind="args">{{ args.default || 'Button' }}</PongButton>
		`,
	}),
	args: {
		variant: 'solid',
		size: 'medium',
		loading: false,
		default: 'Button',
	},
};

export const Variants: Story = {
	render: () => ({
		components: { PongButton },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<PongButton variant="solid" size="medium">Solid</PongButton>
				<PongButton variant="brand" size="medium">Brand</PongButton>
				<PongButton variant="outline" size="medium">Outline</PongButton>
				<PongButton variant="ghost" size="medium">Ghost</PongButton>
				<PongButton variant="destructive" size="medium">Destructive</PongButton>
				<PongButton variant="success" size="medium">Success</PongButton>
			</div>
		`,
	}),
	args: {},
};

export const Sizes: Story = {
	render: () => ({
		components: { PongButton },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<PongButton variant="solid" size="xsmall">XSmall</PongButton>
				<PongButton variant="solid" size="small">Small</PongButton>
				<PongButton variant="solid" size="medium">Medium</PongButton>
				<PongButton variant="solid" size="large">Large</PongButton>
				<PongButton variant="solid" size="xlarge">XLarge</PongButton>
			</div>
		`,
	}),
	args: {},
};

export const WithIcons: Story = {
	render: () => ({
		components: { PongButton, PongIcon },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<PongButton variant="solid" size="medium">
					<PongIcon icon="plus" size="medium" />
					Add Item
				</PongButton>
				<PongButton variant="solid" size="medium">
					Continue
					<PongIcon icon="arrow-right" size="medium" />
				</PongButton>
				<PongButton variant="solid" size="medium">
					<PongIcon icon="plus" size="medium" />
					Options
					<PongIcon icon="chevron-down" size="medium" />
				</PongButton>
			</div>
		`,
	}),
	args: {},
};

export const Loading: Story = {
	render: () => ({
		components: { PongButton },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<PongButton variant="solid" size="medium" loading>Solid</PongButton>
				<PongButton variant="brand" size="medium" loading>Brand</PongButton>
				<PongButton variant="outline" size="medium" loading>Outline</PongButton>
				<PongButton variant="ghost" size="medium" loading>Ghost</PongButton>
				<PongButton variant="destructive" size="medium" loading>Destructive</PongButton>
				<PongButton variant="success" size="medium" loading>Success</PongButton>
			</div>
		`,
	}),
	args: {},
};

export const Link: Story = {
	render: () => ({
		components: { PongButton },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<PongButton variant="solid" size="medium" href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">Link</PongButton>
				<PongButton variant="brand" size="medium" href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">Link</PongButton>
				<PongButton variant="outline" size="medium" href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">Link</PongButton>
				<PongButton variant="ghost" size="medium" href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">Link</PongButton>
				<PongButton variant="destructive" size="medium" href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">Link</PongButton>
				<PongButton variant="success" size="medium" href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness\">Link</PongButton>
			</div>
		`,
	}),
	args: {},
};

export const IconOnly: Story = {
	render: () => ({
		components: { PongButton, PongIcon },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<PongButton variant="solid" size="xsmall" icon="plus" icon-only aria-label="Add" />
				<PongButton variant="solid" size="small" icon="plus" icon-only aria-label="Add" />
				<PongButton variant="solid" size="medium" icon="plus" icon-only aria-label="Add" />
				<PongButton loading variant="solid" size="medium" icon-only aria-label="Add">
					<PongIcon icon="plus" size="medium" />
				</PongButton>
			</div>
		`,
	}),
	args: {},
};

export const Disabled: Story = {
	render: () => ({
		components: { PongButton },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<PongButton variant="solid" size="medium" disabled>Solid</PongButton>
				<PongButton variant="brand" size="medium" disabled>Brand</PongButton>
				<PongButton variant="outline" size="medium" disabled>Outline</PongButton>
				<PongButton variant="ghost" size="medium" disabled>Ghost</PongButton>
				<PongButton variant="destructive" size="medium" disabled>Destructive</PongButton>
				<PongButton variant="success" size="medium" disabled>Success</PongButton>
			</div>
		`,
	}),
	args: {},
};

/**
 * ## Migration from `type` to `variant`
 *
 * The `type` prop is deprecated. Use `variant` instead with this mapping:
 *
 * | Legacy `type` | Current `variant` |
 * |---------------|-------------------|
 * | `primary`     | `solid`           |
 * | `secondary`   | `outline`          |
 * | `tertiary`    | `ghost`           |
 * | `danger`      | `destructive`     |
 * | `success`     | `success`         |
 *
 * Additionally:
 * - `outline` prop → `variant="outline"`
 * - `text` prop → `variant="ghost"`
 */
export const TypeToVariantMapping: Story = {
	render: () => ({
		components: { PongButton },
		template: `
		<div style="display: grid; gap: 24px;">
			<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: center; font-family: var(--font-family); font-size: var(--font-size--sm);">
				<strong>Legacy type</strong>
				<strong>Current variant</strong>
				<strong>Result</strong>

				<code>type="primary"</code>
				<code>variant="solid"</code>
				<PongButton variant="solid">Solid</PongButton>

				<code>type="secondary"</code>
				<code>variant="outline"</code>
				<PongButton variant="outline">Outline</PongButton>

				<code>type="tertiary"</code>
				<code>variant="ghost"</code>
				<PongButton variant="ghost">Ghost</PongButton>

				<code>type="danger"</code>
				<code>variant="destructive"</code>
				<PongButton variant="destructive">Destructive</PongButton>

				<code>type="success"</code>
				<code>variant="success"</code>
				<PongButton variant="success">Success</PongButton>

				<code>outline</code>
				<code>variant="outline"</code>
				<PongButton variant="outline">Outline</PongButton>

				<code>text</code>
				<code>variant="ghost"</code>
				<PongButton variant="ghost">Ghost</PongButton>
			</div>
		</div>
		`,
	}),
	args: {},
};

export const IconButtonPatterns: Story = {
	render: () => ({
		components: { PongIconButton },
		template: `
		<div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
			<PongIconButton icon="plus" title="Create" variant="solid" size="xlarge" />
			<PongIconButton icon="plus" title="Create" variant="solid" size="large" />
			<PongIconButton icon="plus" title="Create" variant="solid" size="medium" />
			<PongIconButton icon="plus" title="Create" variant="ghost" size="medium" />
			<PongIconButton icon="plus" title="Create" variant="outline" size="medium" />
			<PongIconButton icon="plus" title="Create" variant="solid" :loading="true" size="medium" />
			<PongIconButton icon="plus" title="Create" variant="solid" :disabled="true" size="medium" />
		</div>
		`,
	}),
	args: {},
};

export const IconTextPatterns: Story = {
	render: () => ({
		components: { IconTextButton },
		template: `
		<div style="display: flex; flex-direction: column; gap: 16px;">
			<IconTextButton icon="undo-2">Restore version</IconTextButton>
			<IconTextButton icon="arrow-up-right" icon-position="right">Show version</IconTextButton>
			<IconTextButton icon="undo-2" :active="true">Restore version</IconTextButton>
			<IconTextButton icon="undo-2" :disabled="true">Restore version</IconTextButton>
		</div>
		`,
	}),
	args: {},
};
