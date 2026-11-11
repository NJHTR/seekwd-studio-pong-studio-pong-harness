import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import PongCollapsiblePanel from './CollapsiblePanel.vue';
import PongHeaderAction from '../PongHeaderAction';
import PongInput from '../PongInput';
import PongInputLabel from '../PongInputLabel';
import PongOption from '../PongOption';
import PongSelect from '../PongSelect';

export default {
	title: 'Core/CollapsiblePanel',
	component: PongCollapsiblePanel,
	argTypes: {
		modelValue: {
			control: 'boolean',
		},
		title: {
			control: 'text',
		},
		showActionsOnHover: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: { component: 'An expandable panel that reveals or hides grouped content.' },
		},
		backgrounds: { default: 'white' },
	},
	decorators: [
		() => ({
			template: '<div style="width: 60%; margin: 0 auto; padding-top: 20px;"><story /></div>',
		}),
	],
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpen = ref(args.modelValue);
		return { args, isOpen };
	},
	props: Object.keys(argTypes),
	components: {
		PongCollapsiblePanel,
		PongInput,
		PongInputLabel,
	},
	template: `
		<PongCollapsiblePanel v-bind="args" v-model="isOpen">
			<div>
				<PongInputLabel label="Value" :bold="false" size="small" />
				<PongInput placeholder="Enter a value" size="small" />
			</div>
		</PongCollapsiblePanel>
	`,
});

const DefaultWithActions: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpen = ref(args.modelValue);
		return { args, isOpen };
	},
	props: Object.keys(argTypes),
	components: {
		PongCollapsiblePanel,
		PongHeaderAction,
		PongInput,
		PongInputLabel,
	},
	template: `
		<PongCollapsiblePanel v-bind="args" v-model="isOpen">
			<template #actions>
				<PongHeaderAction
					icon="trash-2"
					label="Delete"
					danger
					@click="() => console.log('delete')"
				/>
				<PongHeaderAction
					icon="grip-vertical"
					label="Drag to reorder"
					@click="() => console.log('drag')"
				/>
			</template>
			<div>
				<PongInputLabel label="Value" :bold="false" size="small" />
				<PongInput placeholder="Enter a value" size="small" />
			</div>
		</PongCollapsiblePanel>
	`,
});

export const Default = DefaultWithActions.bind({});
Default.args = {
	title: 'Query Parameter 1',
	modelValue: true,
	showActionsOnHover: true,
};

export const Collapsed = DefaultWithActions.bind({});
Collapsed.args = {
	...Default.args,
	modelValue: false,
};

export const WithoutActions = Template.bind({});
WithoutActions.args = {
	title: 'Query Parameter 1',
	modelValue: true,
};

const AlwaysVisibleTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpen = ref(args.modelValue);
		return { args, isOpen };
	},
	props: Object.keys(argTypes),
	components: {
		PongCollapsiblePanel,
		PongHeaderAction,
		PongInput,
		PongInputLabel,
	},
	template: `
		<PongCollapsiblePanel v-bind="args" v-model="isOpen">
			<template #actions>
				<PongHeaderAction
					icon="plus"
					label="Add Parameter"
					@click="() => console.log('add')"
				/>
			</template>
			<div>
				<PongInputLabel label="Value" :bold="false" size="small" />
				<PongInput placeholder="Enter a value" size="small" />
			</div>
		</PongCollapsiblePanel>
	`,
});

export const AlwaysVisibleActions = AlwaysVisibleTemplate.bind({});
AlwaysVisibleActions.args = {
	title: 'Parameters',
	modelValue: true,
	showActionsOnHover: false,
};

const MultipleTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpen1 = ref(true);
		const isOpen2 = ref(false);
		const isOpen3 = ref(false);
		return { args, isOpen1, isOpen2, isOpen3 };
	},
	props: Object.keys(argTypes),
	components: {
		PongCollapsiblePanel,
		PongHeaderAction,
		PongInput,
		PongInputLabel,
	},
	template: `
		<div>
			<PongCollapsiblePanel title="Query Parameter 1" v-model="isOpen1">
				<template #actions>
					<PongHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
					<PongHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
				</template>
				<div>
					<PongInputLabel label="Name" :bold="false" size="small" />
					<PongInput placeholder="eg. page" model-value="page" size="small" />
					<PongInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
					<PongInput placeholder="1" model-value="1" size="small" />
				</div>
			</PongCollapsiblePanel>

			<PongCollapsiblePanel title="Query Parameter 2" v-model="isOpen2">
				<template #actions>
					<PongHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
					<PongHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
				</template>
				<div>
					<PongInputLabel label="Name" :bold="false" size="small" />
					<PongInput placeholder="eg. limit" model-value="limit" size="small" />
					<PongInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
					<PongInput placeholder="10" model-value="10" size="small" />
				</div>
			</PongCollapsiblePanel>

			<PongCollapsiblePanel title="Query Parameter 3" v-model="isOpen3">
				<template #actions>
					<PongHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
					<PongHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
				</template>
				<div>
					<PongInputLabel label="Name" :bold="false" size="small" />
					<PongInput placeholder="eg. sort" model-value="sort" size="small" />
					<PongInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
					<PongInput placeholder="asc" model-value="asc" size="small" />
				</div>
			</PongCollapsiblePanel>
		</div>
	`,
});

export const MultipleItems = MultipleTemplate.bind({});

const NestedTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const isOpenPagination = ref(true);
		const isOpenParameters = ref(true);
		const isOpenParam1 = ref(true);
		const isOpenParam2 = ref(false);
		return { args, isOpenPagination, isOpenParameters, isOpenParam1, isOpenParam2 };
	},
	props: Object.keys(argTypes),
	components: {
		PongCollapsiblePanel,
		PongHeaderAction,
		PongInput,
		PongInputLabel,
		PongSelect,
		PongOption,
	},
	template: `
		<PongCollapsiblePanel
			title="Pagination"
			v-model="isOpenPagination"
			data-item-key="pagination"
		>
			<div>
				<PongInputLabel label="Pagination Mode" :bold="false" size="small" />
				<PongSelect model-value="updateParameter" placeholder="Select pagination mode" size="small">
					<PongOption value="updateParameter" label="Update a Parameter in Each Request" />
					<PongOption value="responseUrl" label="URL From a Response" />
					<PongOption value="responseData" label="Using a Response Data Key" />
				</PongSelect>

				<PongCollapsiblePanel
					title="Parameters"
					v-model="isOpenParameters"
					:show-actions-on-hover="false"
					style="margin-top: var(--spacing--xs);"
				>
					<template #actions>
						<PongHeaderAction icon="plus" label="Add Parameter" @click="() => {}" />
					</template>
					<div style="padding-left: var(--spacing--xs);">
						<PongCollapsiblePanel title="Query Parameter 1" v-model="isOpenParam1">
							<template #actions>
								<PongHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
								<PongHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
							</template>
							<div>
								<PongInputLabel label="Type" :bold="false" size="small" />
								<PongSelect model-value="query" placeholder="Select type" size="small">
									<PongOption value="query" label="Query" />
									<PongOption value="header" label="Header" />
								</PongSelect>
								<PongInputLabel label="Name" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
								<PongInput placeholder="eg. page" model-value="page" size="small" />
								<PongInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
								<PongInput placeholder="1" model-value="{{ $pageCount }}" size="small" />
							</div>
						</PongCollapsiblePanel>
						<PongCollapsiblePanel title="Query Parameter 2" v-model="isOpenParam2">
							<template #actions>
								<PongHeaderAction icon="trash-2" label="Delete" danger @click="() => {}" />
								<PongHeaderAction icon="grip-vertical" label="Drag to reorder" @click="() => {}" />
							</template>
							<div>
								<PongInputLabel label="Type" :bold="false" size="small" />
								<PongSelect model-value="header" placeholder="Select type" size="small">
									<PongOption value="query" label="Query" />
									<PongOption value="header" label="Header" />
								</PongSelect>
								<PongInputLabel label="Name" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
								<PongInput placeholder="eg. limit" model-value="limit" size="small" />
								<PongInputLabel label="Value" :bold="false" size="small" style="margin-top: var(--spacing--xs);" />
								<PongInput placeholder="10" model-value="10" size="small" />
							</div>
						</PongCollapsiblePanel>
					</div>
				</PongCollapsiblePanel>

				<div style="margin-top: var(--spacing--xs);">
					<PongInputLabel label="Pagination Complete When" :bold="false" size="small" />
					<PongSelect model-value="responseEmpty" placeholder="Select condition" size="small">
						<PongOption value="responseEmpty" label="Response Is Empty" />
						<PongOption value="other" label="Other Condition" />
					</PongSelect>
				</div>
			</div>
		</PongCollapsiblePanel>
	`,
});

export const NestedCollections = NestedTemplate.bind({});
