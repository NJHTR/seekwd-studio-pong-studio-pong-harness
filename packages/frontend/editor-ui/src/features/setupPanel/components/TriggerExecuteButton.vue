<script setup lang="ts">
import { computed } from 'vue';
import { PongButton, PongTooltip } from '@pong/design-system';
import type { IconName } from '@pong/design-system';

const props = defineProps<{
	label: string;
	icon: IconName | undefined;
	disabled: boolean;
	loading: boolean;
	tooltipItems: string[];
}>();

const emit = defineEmits<{
	click: [];
}>();

const hasTooltip = computed(() => props.tooltipItems.length > 0);

const onClick = async () => {
	emit('click');
};
</script>

<template>
	<PongTooltip :disabled="!hasTooltip" placement="top">
		<template #content>
			<p v-for="(item, index) in tooltipItems" :key="index" :class="$style.tooltipItem">
				{{ item }}
			</p>
		</template>
		<PongButton
			data-test-id="trigger-execute-button"
			:label="label"
			:disabled="disabled"
			:loading="loading"
			:icon="icon"
			size="small"
			@click="onClick"
		/>
	</PongTooltip>
</template>

<style module lang="scss">
.tooltipItem {
	margin: 0;
	padding: 0;

	& + & {
		margin-top: var(--spacing--5xs);
	}
}
</style>
