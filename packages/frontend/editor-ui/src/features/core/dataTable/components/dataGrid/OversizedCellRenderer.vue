<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import { PongTooltip } from '@pong/design-system';

const i18n = useI18n();
</script>

<template>
	<PongTooltip placement="top">
		<template #content>
			{{ i18n.baseText('dataTable.cell.oversized.tooltip') }}
		</template>
		<span class="pong-oversized-value">{{ i18n.baseText('dataTable.cell.oversized') }}</span>
	</PongTooltip>
</template>

<style lang="scss">
.pong-oversized-value {
	font-style: italic;
	color: var(--color--warning);
}
</style>
