import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { defineComponent, nextTick, ref } from 'vue';

import PongIcon from '../PongIcon';
import PongListbox from './Listbox.vue';
import PongListboxItem from './ListboxItem.vue';

const Harness = defineComponent({
	components: { PongListbox, PongListboxItem },
	props: {
		modelValue: { type: String, required: false },
	},
	emits: ['update:modelValue', 'select'],
	setup(props, { emit }) {
		const value = ref(props.modelValue);
		function onUpdate(next: string | undefined) {
			value.value = next;
			emit('update:modelValue', next);
		}
		function onKeep(event: Event) {
			event.preventDefault();
			emit('select', event);
		}
		return { value, onUpdate, onKeep };
	},
	template: `
		<PongListbox :model-value="value" label="Versions" @update:model-value="onUpdate">
			<PongListboxItem value="v2">
				<span data-test-id="v2-body">v2</span>
			</PongListboxItem>
			<PongListboxItem value="v1">
				<span data-test-id="v1-body">v1</span>
			</PongListboxItem>
			<PongListboxItem value="v0" disabled>v0</PongListboxItem>
			<PongListboxItem value="keep" @select="onKeep">Keep</PongListboxItem>
		</PongListbox>
	`,
});

const ControlledFrozen = defineComponent({
	components: { PongListbox, PongListboxItem },
	template: `
		<PongListbox model-value="v1" label="Versions">
			<PongListboxItem value="v2">v2</PongListboxItem>
			<PongListboxItem value="v1">v1</PongListboxItem>
		</PongListbox>
	`,
});

const ControlledExternal = defineComponent({
	components: { PongListbox, PongListboxItem },
	setup() {
		const value = ref('v1');
		return { value };
	},
	template: `
		<div>
			<button type="button" @click="value = 'v2'">Set v2</button>
			<PongListbox v-model="value" label="Versions">
				<PongListboxItem value="v2">v2</PongListboxItem>
				<PongListboxItem value="v1">v1</PongListboxItem>
			</PongListbox>
		</div>
	`,
});

const Uncontrolled = defineComponent({
	components: { PongListbox, PongListboxItem },
	template: `
		<PongListbox default-value="v1" label="Versions">
			<PongListboxItem value="v2">v2</PongListboxItem>
			<PongListboxItem value="v1">v1</PongListboxItem>
		</PongListbox>
	`,
});

const SelectionHarness = defineComponent({
	components: { PongListbox, PongListboxItem },
	props: {
		selectionBehavior: { type: String, required: true },
	},
	emits: ['update:modelValue'],
	setup(_, { emit }) {
		const value = ref<string | undefined>('v2');
		function onUpdate(next: string | undefined) {
			value.value = next;
			emit('update:modelValue', next);
		}
		return { value, onUpdate };
	},
	template: `
		<PongListbox
			:model-value="value"
			:selection-behavior="selectionBehavior"
			label="Versions"
			@update:model-value="onUpdate"
		>
			<PongListboxItem value="v2">v2</PongListboxItem>
			<PongListboxItem value="v1">v1</PongListboxItem>
		</PongListbox>
	`,
});

const DisabledList = defineComponent({
	components: { PongListbox, PongListboxItem },
	emits: ['update:modelValue'],
	setup(_, { emit }) {
		function onUpdate(next: string | undefined) {
			emit('update:modelValue', next);
		}
		return { onUpdate };
	},
	template: `
		<PongListbox model-value="v1" label="Versions" disabled @update:model-value="onUpdate">
			<PongListboxItem value="v2">v2</PongListboxItem>
			<PongListboxItem value="v1">v1</PongListboxItem>
		</PongListbox>
	`,
});

const HoverHarness = defineComponent({
	components: { PongListbox, PongListboxItem },
	setup() {
		const value = ref('v2');
		return { value };
	},
	template: `
		<PongListbox v-model="value" label="Versions">
			<PongListboxItem value="v2">v2</PongListboxItem>
			<PongListboxItem value="v1">v1</PongListboxItem>
		</PongListbox>
	`,
});

const HorizontalHarness = defineComponent({
	components: { PongListbox, PongListboxItem },
	setup() {
		const value = ref('compact');
		return { value };
	},
	template: `
		<PongListbox v-model="value" orientation="horizontal" label="Density">
			<PongListboxItem value="compact">Compact</PongListboxItem>
			<PongListboxItem value="comfortable">Comfortable</PongListboxItem>
			<PongListboxItem value="spacious">Spacious</PongListboxItem>
		</PongListbox>
	`,
});

const TabHarness = defineComponent({
	components: { PongListbox, PongListboxItem },
	setup() {
		const value = ref('v2');
		return { value };
	},
	template: `
		<div>
			<button type="button">Before</button>
			<PongListbox v-model="value" label="Versions">
				<PongListboxItem value="v2">
					<span>v2</span>
					<button type="button">v2 actions</button>
				</PongListboxItem>
				<PongListboxItem value="v1">
					<span>v1</span>
					<button type="button">v1 actions</button>
				</PongListboxItem>
				<PongListboxItem value="v0" disabled>
					<span>v0</span>
					<button type="button">v0 actions</button>
				</PongListboxItem>
				<PongListboxItem value="archive">
					<span>archive</span>
					<button type="button">archive actions</button>
				</PongListboxItem>
			</PongListbox>
			<button type="button">After</button>
		</div>
	`,
});

const LayoutHarness = defineComponent({
	components: { PongListbox, PongListboxItem, PongIcon },
	template: `
		<PongListbox label="Workflows">
			<PongListboxItem value="sync">
				<template #leading>
					<PongIcon icon="copy" size="large" />
				</template>
				<span data-test-id="sync-body">Sync</span>
				<template #trailing>
					<button type="button">Actions</button>
				</template>
			</PongListboxItem>
			<PongListboxItem value="custom">
				<template #leading>
					<span data-test-id="custom-leading">Lead</span>
				</template>
				Custom
			</PongListboxItem>
		</PongListbox>
	`,
});

const AttrHarness = defineComponent({
	components: { PongListbox, PongListboxItem },
	template: `
		<PongListbox class="caller" label="Versions" data-test-id="list">
			<PongListboxItem value="v1">v1</PongListboxItem>
		</PongListbox>
	`,
});

describe('PongListbox', () => {
	it('places an icon before the content and a trailing control after it', () => {
		const { getByRole, getByTestId } = render(LayoutHarness);
		const sync = getByRole('option', { name: 'Sync Actions' });
		const custom = getByRole('option', { name: 'Lead Custom' });
		const icon = sync.querySelector('[data-icon="copy"]');
		const content = getByTestId('sync-body');
		const action = getByRole('button', { name: 'Actions' });

		expect(icon).toBeInstanceOf(Element);
		expect(sync).toContainElement(content);
		expect(sync).toContainElement(action);
		expect(
			(icon as Element).compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(content.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
		expect(custom.querySelector('[data-icon]')).toBeNull();
		expect(custom).toContainElement(getByTestId('custom-leading'));
	});

	it('puts caller attributes on the list root and the label on the listbox', () => {
		const { getByRole, getByTestId } = render(AttrHarness);
		const list = getByRole('listbox', { name: 'Versions' });
		const root = getByTestId('list');

		expect(root).toHaveClass('caller');
		expect(list.parentElement).toBe(root);
	});

	it('selects an item and paints the whole option', async () => {
		const { getByRole, getByTestId, emitted } = render(Harness, { props: { modelValue: 'v1' } });
		const current = getByRole('option', { name: 'v2' });

		expect(getByRole('listbox', { name: 'Versions' })).toContainElement(current);
		expect(getByRole('option', { name: 'v1' })).toHaveAttribute('aria-selected', 'true');
		expect(current).toContainElement(getByTestId('v2-body'));

		await userEvent.click(current);

		expect(emitted('update:modelValue')).toEqual([['v2']]);
		expect(current).toHaveAttribute('aria-selected', 'true');
		expect(current).toHaveAttribute('data-highlighted');
	});

	it('moves the highlight with the arrow keys and selects on Enter', async () => {
		const { getByRole, emitted } = render(Harness, { props: { modelValue: 'v2' } });
		await nextTick();
		const current = getByRole('option', { name: 'v2' });
		current.focus();

		await userEvent.keyboard('{ArrowDown}');

		const next = getByRole('option', { name: 'v1' });
		expect(next).toHaveAttribute('data-highlighted');
		expect(next).toContainElement(next.querySelector('[data-test-id="v1-body"]'));
		expect(current).not.toHaveAttribute('data-highlighted');

		await userEvent.keyboard('{Enter}');

		expect(emitted('update:modelValue')).toEqual([['v1']]);
	});

	it('selects the highlighted item on Space', async () => {
		const { getByRole, emitted } = render(Harness, { props: { modelValue: 'v2' } });
		await nextTick();
		getByRole('option', { name: 'v2' }).focus();

		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard(' ');

		expect(emitted('update:modelValue')).toEqual([['v1']]);
	});

	it('skips a disabled item', async () => {
		const { getByRole, emitted } = render(Harness, { props: { modelValue: 'v1' } });
		const disabled = getByRole('option', { name: 'v0' });

		expect(disabled).toHaveAttribute('aria-disabled', 'true');
		await userEvent.click(disabled);

		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('skips a disabled item with the arrow keys', async () => {
		const { getByRole } = render(Harness, { props: { modelValue: 'v1' } });
		await nextTick();
		getByRole('option', { name: 'v1' }).focus();

		await userEvent.keyboard('{ArrowDown}');

		expect(getByRole('option', { name: 'Keep' })).toHaveAttribute('data-highlighted');
		expect(getByRole('option', { name: 'v0' })).not.toHaveAttribute('data-highlighted');
	});

	it('does not change the value when the list is disabled', async () => {
		const { getByRole, emitted } = render(DisabledList);

		await userEvent.click(getByRole('option', { name: 'v2' }));

		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('keeps the value when the item select event is cancelled', async () => {
		const { getByRole, emitted } = render(Harness, { props: { modelValue: 'v2' } });

		await userEvent.click(getByRole('option', { name: 'Keep' }));

		expect(emitted('select')).toHaveLength(1);
		expect(emitted('update:modelValue')).toBeUndefined();
		expect(getByRole('option', { name: 'v2' })).toHaveAttribute('aria-selected', 'true');
	});

	it('keeps the parent value until the parent accepts the update', async () => {
		const { getByRole } = render(ControlledFrozen);

		await userEvent.click(getByRole('option', { name: 'v2' }));

		expect(getByRole('option', { name: 'v1' })).toHaveAttribute('aria-selected', 'true');
		expect(getByRole('option', { name: 'v2' })).not.toHaveAttribute('aria-selected', 'true');
	});

	it('follows a value set from outside the list', async () => {
		const { getByRole } = render(ControlledExternal);

		await userEvent.click(getByRole('button', { name: 'Set v2' }));

		expect(getByRole('option', { name: 'v2' })).toHaveAttribute('aria-selected', 'true');
	});

	it('uses defaultValue when the parent does not bind a value', async () => {
		const { getByRole } = render(Uncontrolled);

		expect(getByRole('option', { name: 'v1' })).toHaveAttribute('aria-selected', 'true');

		await userEvent.click(getByRole('option', { name: 'v2' }));

		expect(getByRole('option', { name: 'v2' })).toHaveAttribute('aria-selected', 'true');
		expect(getByRole('option', { name: 'v1' })).not.toHaveAttribute('aria-selected', 'true');
	});

	it('keeps the value when the user activates the selected item again', async () => {
		const { getByRole } = render(SelectionHarness, { props: { selectionBehavior: 'replace' } });

		await userEvent.click(getByRole('option', { name: 'v2' }));

		expect(getByRole('option', { name: 'v2' })).toHaveAttribute('aria-selected', 'true');
	});

	it('clears the value when selection behavior is toggle', async () => {
		const { getByRole, emitted } = render(SelectionHarness, {
			props: { selectionBehavior: 'toggle' },
		});

		await userEvent.click(getByRole('option', { name: 'v2' }));

		expect(emitted('update:modelValue')).toEqual([[undefined]]);
		expect(getByRole('option', { name: 'v2' })).not.toHaveAttribute('aria-selected', 'true');
		expect(getByRole('option', { name: 'v1' })).not.toHaveAttribute('aria-selected', 'true');
	});

	it('moves the highlight with the pointer', async () => {
		const { getByRole } = render(HoverHarness);
		await nextTick();

		await userEvent.hover(getByRole('option', { name: 'v1' }));

		expect(getByRole('option', { name: 'v1' })).toHaveAttribute('data-highlighted');
		expect(getByRole('option', { name: 'v2' })).not.toHaveAttribute('data-highlighted');
	});

	it('moves Tab from a control inside an item to the next item', async () => {
		const { getByRole } = render(TabHarness);
		await nextTick();
		const v2 = getByRole('option', { name: 'v2 v2 actions' });
		const v1 = getByRole('option', { name: 'v1 v1 actions' });
		const archive = getByRole('option', { name: 'archive archive actions' });
		v2.focus();

		await userEvent.tab();
		expect(getByRole('button', { name: 'v2 actions' })).toHaveFocus();

		await userEvent.tab();
		expect(v1).toHaveFocus();
		expect(v1).toHaveAttribute('data-highlighted');

		await userEvent.tab();
		expect(getByRole('button', { name: 'v1 actions' })).toHaveFocus();

		await userEvent.tab();
		expect(archive).toHaveFocus();
		expect(getByRole('option', { name: 'v0 v0 actions' })).not.toHaveAttribute('data-highlighted');

		await userEvent.tab();
		expect(getByRole('button', { name: 'archive actions' })).toHaveFocus();

		await userEvent.tab();
		expect(getByRole('button', { name: 'After' })).toHaveFocus();

		v1.focus();
		await userEvent.tab();
		expect(getByRole('button', { name: 'v1 actions' })).toHaveFocus();

		await userEvent.tab({ shift: true });
		expect(v1).toHaveFocus();

		await userEvent.tab({ shift: true });
		expect(getByRole('button', { name: 'v2 actions' })).toHaveFocus();

		await userEvent.tab({ shift: true });
		expect(v2).toHaveFocus();

		await userEvent.tab({ shift: true });
		expect(getByRole('button', { name: 'Before' })).toHaveFocus();
	});

	it('moves the highlight with Left and Right when orientation is horizontal', async () => {
		const { getByRole } = render(HorizontalHarness);
		await nextTick();
		const list = getByRole('listbox', { name: 'Density' });

		expect(list).toHaveAttribute('aria-orientation', 'horizontal');
		expect(list).toHaveAttribute('data-orientation', 'horizontal');

		getByRole('option', { name: 'Compact' }).focus();
		await userEvent.keyboard('{ArrowRight}');

		expect(getByRole('option', { name: 'Comfortable' })).toHaveAttribute('data-highlighted');

		await userEvent.keyboard('{ArrowDown}');

		expect(getByRole('option', { name: 'Comfortable' })).toHaveAttribute('data-highlighted');
		expect(getByRole('option', { name: 'Spacious' })).not.toHaveAttribute('data-highlighted');
	});
});
