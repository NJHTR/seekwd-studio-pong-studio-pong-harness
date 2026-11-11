<script setup lang="ts">
import TitledList from '@/app/components/TitledList.vue';
import { useI18n } from '@pong/i18n';
import { PongIcon, PongTooltip } from '@pong/design-system';
defineProps<{
	issues: string[];
}>();

const i18n = useI18n();
</script>

<template>
	<div v-if="issues.length" :class="$style['parameter-issues']" data-test-id="parameter-issues">
		<PongTooltip placement="top">
			<template #content>
				<TitledList :title="`${i18n.baseText('parameterInput.issues')}:`" :items="issues" />
			</template>
			<PongIcon icon="triangle-alert" />
		</PongTooltip>
	</div>
</template>

<style module lang="scss">
.parameter-issues {
	text-align: right;
	float: right;
	color: var(--color--danger--tint-1);
	font-size: var(--font-size--sm);
	padding-left: var(--spacing--3xs);
}
</style>
