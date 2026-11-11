import type { StoryFn } from '@storybook/vue3-vite';
import type { ComponentInstance } from 'vue';

import PongRecycleScroller from './RecycleScroller.vue';

export default {
	title: 'Core/RecycleScroller',
	component: PongRecycleScroller,
	argTypes: {},

	parameters: {
		docs: {
			description: {
				component: 'A virtualized list container for efficiently rendering large datasets.',
			},
		},
	},
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		PongRecycleScroller,
	},
	data() {
		return {
			items: Array.from(Array(256).keys()).map((i) => ({ id: i })) as Array<{
				id: number;
				height: number;
			}>,
		};
	},
	methods: {
		resizeItem(item: { id: string; height: string }, fn: (item: { id: string }) => void) {
			const itemRef = (this as ComponentInstance<typeof PongRecycleScroller>).$refs[
				`item-${item.id}`
			] as HTMLElement;

			item.height = '200px';
			itemRef.style.height = '200px';
			fn(item);
		},
		getItemStyle(item: { id: string; height?: string }) {
			return {
				height: item.height || '100px',
				width: '100%',
				backgroundColor: `hsl(${parseInt(item.id, 10) * 1.4}, 100%, 50%)`,
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			};
		},
	},
	template: `<div style="height: calc(100vh - 30px); width: 100%; overflow: auto">
		<PongRecycleScroller :items="items" :item-size="100" item-key="id" v-bind="args">
			<template	#default="{ item, updateItemSize }">
				<div
					:ref="'item-' + item.id"
					:style="getItemStyle(item)"
					@click="resizeItem(item, updateItemSize)"
				>
					{{item.id}}
				</div>
			</template>
		</PongRecycleScroller>
	</div>`,
});

export const Default = Template.bind({});
