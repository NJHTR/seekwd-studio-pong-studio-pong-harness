<script setup lang="ts" generic="T extends string">
import {
	PongButton,
	PongDropdownMenu,
	PongIcon,
	PongTooltip,
	type DropdownMenuItemProps,
	type IconName,
} from '@pong/design-system';
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	options: Array<{ value: T; label: string; icon: IconName }>;
	label: string;
}>();

const selected = defineModel<T>({ required: true });

const items = computed<Array<DropdownMenuItemProps<T>>>(() =>
	props.options.map(({ value, label, icon }) => ({
		id: value,
		label,
		icon: { type: 'icon', value: icon },
		checked: value === selected.value,
	})),
);

const selectedOption = computed(() => props.options.find(({ value }) => value === selected.value));
</script>

<template>
	<PongTooltip :content="label">
		<PongDropdownMenu
			v-bind="$attrs"
			:items="items"
			placement="bottom-end"
			@select="selected = $event"
		>
			<template #trigger>
				<PongButton variant="ghost" size="small" :aria-label="label">
					<PongIcon v-if="selectedOption" :icon="selectedOption.icon" size="small" />
					<PongIcon icon="chevron-down" :size="12" />
				</PongButton>
			</template>
		</PongDropdownMenu>
	</PongTooltip>
</template>
