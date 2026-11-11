import type { StoryFn } from '@storybook/vue3-vite';
import type { PopoverContentProps } from 'reka-ui';
import { reactive, ref } from 'vue';

import PongPopover from './Popover.vue';
import PongButton from '../PongButton/Button.vue';
import PongInput from '../PongInput/Input.vue';

const SIDE_OPTIONS = ['top', 'right', 'bottom', 'left'] satisfies Array<
	NonNullable<PopoverContentProps['side']>
>;

const ALIGN_OPTIONS = ['start', 'center', 'end'] satisfies Array<
	NonNullable<PopoverContentProps['align']>
>;

const SIDES_FOR_ALIGNMENT_VARIANTS = ['top', 'right', 'bottom', 'left'] as const;
const ALIGNS_FOR_ALIGNMENT_VARIANTS = ['start', 'center', 'end'] as const;

export default {
	title: 'Core/Popover',
	component: PongPopover,
	argTypes: {
		enableScrolling: {
			control: 'boolean',
		},
		scrollType: {
			control: 'select',
			options: ['auto', 'always', 'scroll', 'hover'],
		},
		maxHeight: {
			control: 'text',
		},
		side: {
			control: 'select',
			options: SIDE_OPTIONS,
		},
		align: {
			control: 'select',
			options: ALIGN_OPTIONS,
		},
	},

	parameters: {
		docs: {
			description: { component: 'A floating content panel anchored to a trigger element.' },
		},
	},
};

const Template: StoryFn = (args) => ({
	setup() {
		const username = ref('');
		const email = ref('');
		const isOpen = ref(false);

		return { args, username, email, isOpen };
	},
	components: {
		PongPopover,
		PongButton,
		PongInput,
	},
	template: `
		<div>
			<PongPopover v-model:open="isOpen" v-bind="args">
				<template #trigger>
					<PongButton>Open Form</PongButton>
				</template>
				<template #content="{ close }">
					<div style="display: flex; flex-direction: column; gap: 12px; padding: var(--spacing--sm);">
						<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: var(--font-weight--medium);">User Information</h3>
						<PongInput
							v-model="username"
							placeholder="Enter username"
							label="Username"
						/>
						<PongInput
							v-model="email"
							placeholder="Enter email"
							label="Email"
							type="email"
						/>
						<div style="display: flex; gap: 8px; margin-top: 8px;">
							<PongButton size="small">Save</PongButton>
							<PongButton size="small" @click="close">Cancel</PongButton>
						</div>
					</div>
				</template>
			</PongPopover>
		</div>
	`,
});

export const Default = Template.bind({});
Default.args = {};

const ScrollableTemplate: StoryFn = (args) => ({
	setup() {
		const isOpen = ref(false);
		return { args, isOpen };
	},
	components: {
		PongPopover,
		PongButton,
	},
	template: `
		<div>
			<PongPopover v-model:open="isOpen" v-bind="args">
				<template #trigger>
					<PongButton>Open Scrollable Menu</PongButton>
				</template>
				<template #content="{ close }">
					<div style="display: flex; flex-direction: column; gap: 8px; padding: var(--spacing--sm);">
						<h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: var(--font-weight--medium);">Menu Items</h3>
						<div v-for="i in 20" :key="i" 
							style="padding: 8px 12px; background: var(--color--background); border-radius: 4px; cursor: pointer; min-height: 40px; display: flex; align-items: center;"
							@click="close"
						>
							Menu Item {{ i }}: Some description text that explains what this item does
						</div>
					</div>
				</template>
			</PongPopover>
		</div>
	`,
});

export const WithScrolling = ScrollableTemplate.bind({});
WithScrolling.args = {
	maxHeight: '300px',
	enableScrolling: true,
	scrollType: 'hover',
};
WithScrolling.storyName = 'With Scrollable Content';

export const AlwaysVisibleScrollbars = ScrollableTemplate.bind({});
AlwaysVisibleScrollbars.args = {
	maxHeight: '250px',
	enableScrolling: true,
	scrollType: 'always',
};
AlwaysVisibleScrollbars.storyName = 'Always Visible Scrollbars';

export const SideTop = Template.bind({});
SideTop.args = {
	side: 'top',
};
SideTop.storyName = 'Side Top';

export const SideRight = Template.bind({});
SideRight.args = {
	side: 'right',
};
SideRight.storyName = 'Side Right';

export const SideBottom = Template.bind({});
SideBottom.args = {
	side: 'bottom',
};
SideBottom.storyName = 'Side Bottom';

export const SideLeft = Template.bind({});
SideLeft.args = {
	side: 'left',
};
SideLeft.storyName = 'Side Left';

const AlignmentVariantsTemplate: StoryFn = (args) => ({
	setup() {
		const openStates = reactive<Record<string, boolean>>({});

		for (const side of SIDES_FOR_ALIGNMENT_VARIANTS) {
			for (const align of ALIGNS_FOR_ALIGNMENT_VARIANTS) {
				openStates[`${side}-${align}`] = false;
			}
		}

		return {
			args,
			openStates,
			sides: SIDES_FOR_ALIGNMENT_VARIANTS,
			aligns: ALIGNS_FOR_ALIGNMENT_VARIANTS,
		};
	},
	components: {
		PongPopover,
		PongButton,
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start">
			<div v-for="side in sides" :key="side" style="display: flex; align-items: center; gap: 12px;">
				<div style="width: 56px; text-transform: capitalize; font-size: 12px; color: var(--color--text--tint-1);">
					{{ side }}
				</div>
				<div style="display: flex; gap: 8px;">
					<PongPopover
						v-for="align in aligns"
						:key="side + '-' + align"
						v-model:open="openStates[side + '-' + align]"
						v-bind="args"
						:side="side"
						:align="align"
					>
						<template #trigger>
							<PongButton>{{ align }}</PongButton>
						</template>
						<template #content>
							<div style="padding: var(--spacing--sm); min-width: 160px; text-transform: capitalize;">
								{{ side }} + {{ align }}
							</div>
						</template>
					</PongPopover>
				</div>
			</div>
		</div>
	`,
});

export const AlignmentVariants = AlignmentVariantsTemplate.bind({});
AlignmentVariants.args = {
	enableScrolling: false,
};
AlignmentVariants.storyName = 'Alignment Variants';
