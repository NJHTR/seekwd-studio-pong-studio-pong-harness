import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import type { ActionDropdownItem } from '../../types';
import PongActionDropdown from '../PongActionDropdown/ActionDropdown.vue';
import PongBadge from '../PongBadge/Badge.vue';
import PongButton from '../PongButton/Button.vue';
import PongIcon from '../PongIcon/Icon.vue';
import type { IconName } from '../PongIcon/icons';
import PongText from '../PongText/Text.vue';
import PongListbox from './Listbox.vue';
import PongListboxItem from './ListboxItem.vue';

const meta = {
	title: 'Core/Listbox',
	component: PongListbox,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof PongListbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Arrow keys move the highlight. Enter, Space, or a click changes the value. The item sets the padding.',
			},
		},
	},
	render: () => ({
		components: { PongListbox, PongListboxItem },
		setup() {
			const value = ref('v2');
			return { value };
		},
		template: `
			<PongListbox v-model="value" label="Versions" style="flex: none; width: 20rem">
				<PongListboxItem value="v2">v2 · Latest</PongListboxItem>
				<PongListboxItem value="v1">v1 · Published</PongListboxItem>
				<PongListboxItem value="v0">v0 · Draft</PongListboxItem>
			</PongListbox>
		`,
	}),
};

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { PongListbox, PongListboxItem, PongButton },
		setup() {
			const value = ref<string | undefined>('v2');
			const presets: Array<{ label: string; value: string | undefined }> = [
				{ label: 'v2', value: 'v2' },
				{ label: 'v1', value: 'v1' },
				{ label: 'Clear', value: undefined },
			];
			return { value, presets };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xl)">
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Controlled
					</h3>
					<PongListbox v-model="value" label="Versions (controlled)" style="flex: none">
						<PongListboxItem value="v2">v2 · Latest</PongListboxItem>
						<PongListboxItem value="v1">v1 · Published</PongListboxItem>
						<PongListboxItem value="v0">v0 · Draft</PongListboxItem>
					</PongListbox>
					<div style="display: flex; gap: var(--spacing--2xs); flex-wrap: wrap">
						<PongButton
							v-for="preset in presets"
							:key="preset.label"
							size="small"
							variant="outline"
							@click="value = preset.value"
						>
							{{ preset.label }}
						</PongButton>
					</div>
				</section>
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Uncontrolled
					</h3>
					<PongListbox default-value="v1" label="Versions (uncontrolled)" style="flex: none">
						<PongListboxItem value="v2">v2 · Latest</PongListboxItem>
						<PongListboxItem value="v1">v1 · Published</PongListboxItem>
						<PongListboxItem value="v0">v0 · Draft</PongListboxItem>
					</PongListbox>
				</section>
			</div>
		`,
	}),
};

export const Horizontal: Story = {
	parameters: {
		docs: {
			description: {
				story: 'Left and Right move the highlight. Items sit in a row.',
			},
		},
	},
	render: () => ({
		components: { PongListbox, PongListboxItem },
		setup() {
			const value = ref('comfortable');
			return { value };
		},
		template: `
			<PongListbox
				v-model="value"
				orientation="horizontal"
				label="Density"
				style="flex: none"
			>
				<PongListboxItem value="compact">Compact</PongListboxItem>
				<PongListboxItem value="comfortable">Comfortable</PongListboxItem>
				<PongListboxItem value="spacious">Spacious</PongListboxItem>
			</PongListbox>
		`,
	}),
};

export const DisabledItem: Story = {
	name: 'Disabled Item',
	parameters: {
		docs: {
			description: {
				story:
					'Disabled items can sit between other items. Arrow keys skip them. A click does not change the value.',
			},
		},
	},
	render: () => ({
		components: { PongListbox, PongListboxItem },
		setup() {
			const value = ref('v4');
			return { value };
		},
		template: `
			<PongListbox v-model="value" label="Versions" style="flex: none; width: 20rem">
				<PongListboxItem value="v4">v4 · Latest</PongListboxItem>
				<PongListboxItem value="v3">v3 · Published</PongListboxItem>
				<PongListboxItem value="v2" disabled>v2 · Draft</PongListboxItem>
				<PongListboxItem value="v1" disabled>v1 · Review</PongListboxItem>
				<PongListboxItem value="v0">v0 · Archived</PongListboxItem>
			</PongListbox>
		`,
	}),
};

export const SelectionBehavior: Story = {
	name: 'Selection Behavior',
	render: () => ({
		components: { PongListbox, PongListboxItem },
		setup() {
			const replaceValue = ref<string | undefined>('v2');
			const toggleValue = ref<string | undefined>('v2');
			return { replaceValue, toggleValue };
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--xl)">
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Replace
					</h3>
					<PongListbox
						v-model="replaceValue"
						selection-behavior="replace"
						label="Versions (replace)"
						style="flex: none"
					>
						<PongListboxItem value="v2">v2 · Latest</PongListboxItem>
						<PongListboxItem value="v1">v1 · Published</PongListboxItem>
					</PongListbox>
				</section>
				<section style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 20rem">
					<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold)">
						Toggle
					</h3>
					<PongListbox
						v-model="toggleValue"
						selection-behavior="toggle"
						label="Versions (toggle)"
						style="flex: none"
					>
						<PongListboxItem value="v2">v2 · Latest</PongListboxItem>
						<PongListboxItem value="v1">v1 · Published</PongListboxItem>
					</PongListbox>
				</section>
			</div>
		`,
	}),
};

const customItemStyle = `
.listbox-custom-card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--xs);
	border: var(--border-width) solid var(--border-color);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}
.listbox-custom-list [data-highlighted] .listbox-custom-card {
	border-color: var(--color--primary);
}
.listbox-custom-list [data-state='checked'] .listbox-custom-card {
	border-color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}
`;

export const CustomItem: Story = {
	name: 'Custom Item',
	parameters: {
		docs: {
			description: {
				story:
					'Set the item background tokens to transparent and the item padding to 0. The card paints the highlight, the selected fill, and its own padding. The item keeps selection and keyboard behavior.',
			},
		},
	},
	render: () => ({
		components: { PongListbox, PongListboxItem, PongText },
		setup() {
			const value = ref('v2');
			return { value, customItemStyle };
		},
		template: `
			<div class="listbox-custom-list" style="width: 20rem">
				<component :is="'style'">{{ customItemStyle }}</component>
				<PongListbox
					v-model="value"
					label="Versions"
					style="flex: none; --pong-listbox-item--color--background--highlight: transparent; --pong-listbox-item--color--background--selected: transparent; --pong-listbox-item--radius: 0; --pong-listbox-item--padding: 0"
				>
					<PongListboxItem value="v2">
						<span class="listbox-custom-card">
							<span>
								<PongText bold size="small" color="text-dark">v2</PongText>
								<PongText size="small" color="text-light"> · Latest</PongText>
							</span>
							<PongText size="small" color="text-base">Ada Lovelace, Oct 24 at 14:28</PongText>
						</span>
					</PongListboxItem>
					<PongListboxItem value="v1">
						<span class="listbox-custom-card">
							<span>
								<PongText bold size="small" color="text-dark">v1</PongText>
								<PongText size="small" color="text-light"> · Published</PongText>
							</span>
							<PongText size="small" color="text-base">Grace Hopper, Oct 22 at 09:14</PongText>
						</span>
					</PongListboxItem>
					<PongListboxItem value="v0">
						<span class="listbox-custom-card">
							<span>
								<PongText bold size="small" color="text-dark">v0</PongText>
								<PongText size="small" color="text-light"> · Draft</PongText>
							</span>
							<PongText size="small" color="text-base">Alan Turing, Oct 18 at 16:02</PongText>
						</span>
					</PongListboxItem>
				</PongListbox>
			</div>
		`,
	}),
};

export const LeadingAndTrailing: Story = {
	name: 'Leading and Trailing',
	parameters: {
		docs: {
			description: {
				story:
					'Leading content sits before the row. Trailing content sits after it. Use the actions menu story for a trailing control.',
			},
		},
	},
	render: () => ({
		components: { PongListbox, PongListboxItem, PongBadge, PongIcon, PongText },
		setup() {
			const value = ref('sync');
			return { value };
		},
		template: `
			<div style="width: 24rem">
				<PongListbox v-model="value" label="Workflows" style="flex: none">
					<PongListboxItem value="sync">
						<template #leading>
							<PongIcon icon="refresh-cw" size="large" />
						</template>
						<PongText bold size="small" color="text-dark">Sync contacts</PongText>
						<PongText size="small" color="text-light">Runs every hour</PongText>
						<template #trailing>
							<PongBadge variant="success">Active</PongBadge>
						</template>
					</PongListboxItem>
					<PongListboxItem value="digest">
						<template #leading>
							<PongIcon icon="copy" size="large" />
						</template>
						<PongText bold size="small" color="text-dark">Weekly digest</PongText>
						<PongText size="small" color="text-light">Sends on Monday</PongText>
						<template #trailing>
							<PongBadge variant="outline">Paused</PongBadge>
						</template>
					</PongListboxItem>
					<PongListboxItem value="acme">
						<template #leading>
							<PongIcon icon="briefcase" size="large" />
						</template>
						<PongText bold size="small" color="text-dark">Acme CRM sync</PongText>
						<PongText size="small" color="text-light">Runs on demand</PongText>
						<template #trailing>
							<PongBadge variant="danger">Failed</PongBadge>
						</template>
					</PongListboxItem>
				</PongListbox>
			</div>
		`,
	}),
};

const workflowActions: Array<ActionDropdownItem<string>> = [
	{ id: 'duplicate', label: 'Duplicate', icon: 'copy' },
	{ id: 'rename', label: 'Rename', icon: 'pencil' },
	{ id: 'delete', label: 'Delete', icon: 'trash-2', divided: true, variant: 'destructive' },
];

export const ActionsMenu: Story = {
	name: 'Actions Menu',
	render: () => ({
		components: { PongListbox, PongListboxItem, PongActionDropdown, PongIcon, PongText },
		setup() {
			const workflows: Array<{ id: string; name: string; detail: string; icon: IconName }> = [
				{ id: 'sync', name: 'Sync contacts', detail: 'Runs every hour', icon: 'refresh-cw' },
				{ id: 'digest', name: 'Weekly digest', detail: 'Sends on Monday', icon: 'copy' },
				{ id: 'archive', name: 'Archive old leads', detail: 'Paused', icon: 'archive' },
			];
			const value = ref('sync');
			const lastAction = ref('');
			const selected = computed(
				() => workflows.find((workflow) => workflow.id === value.value)?.name ?? '(none)',
			);

			function onAction(workflowName: string, actionId: string) {
				const label = workflowActions.find((action) => action.id === actionId)?.label ?? actionId;
				lastAction.value = `${label} · ${workflowName}`;
			}

			return {
				workflows,
				workflowActions,
				value,
				lastAction,
				selected,
				onAction,
			};
		},
		template: `
			<div style="display: flex; flex-direction: column; gap: var(--spacing--sm); width: 24rem">
				<PongListbox v-model="value" label="Workflows" style="flex: none">
					<PongListboxItem
						v-for="workflow in workflows"
						:key="workflow.id"
						:value="workflow.id"
					>
						<template #leading>
							<PongIcon :icon="workflow.icon" size="large" />
						</template>
						<PongText bold size="small" color="text-dark">{{ workflow.name }}</PongText>
						<PongText size="small" color="text-light">{{ workflow.detail }}</PongText>
						<template #trailing>
							<PongActionDropdown
								:items="workflowActions"
								activator-size="small"
								placement="bottom-end"
								@click.stop
								@keydown.enter.stop
								@keydown.space.stop
								@select="onAction(workflow.name, $event)"
							/>
						</template>
					</PongListboxItem>
				</PongListbox>
				<p style="margin: 0; font-size: var(--font-size--sm)">
					Selected: <strong>{{ selected }}</strong>
				</p>
				<p style="margin: 0; font-size: var(--font-size--sm)">
					Last action: <strong>{{ lastAction || '(none)' }}</strong>
				</p>
			</div>
		`,
	}),
};
