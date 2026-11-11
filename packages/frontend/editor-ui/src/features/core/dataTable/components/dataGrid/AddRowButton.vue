<script setup lang="ts">
import { computed, toValue } from 'vue';
import { useI18n } from '@pong/i18n';

import { PongIconButton, PongTooltip } from '@pong/design-system';
const i18n = useI18n();

const props = defineProps<{
	params: {
		onClick: () => void;
		disabled?: boolean | (() => boolean);
	};
}>();

const isDisabled = computed(() => toValue(props.params.disabled) ?? false);
</script>

<template>
	<PongTooltip :content="i18n.baseText('dataTable.addRow.label')">
		<PongIconButton
			variant="ghost"
			icon="plus"
			:aria-label="i18n.baseText('dataTable.addRow.label')"
			:disabled="isDisabled"
			@click="props.params.onClick"
		/>
	</PongTooltip>
</template>
