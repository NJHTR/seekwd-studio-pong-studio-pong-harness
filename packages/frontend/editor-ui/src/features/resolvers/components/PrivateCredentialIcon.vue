<script setup lang="ts">
import { computed } from 'vue';

import { PongIcon, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

defineOptions({ inheritAttrs: false });

interface Props {
	tooltip?: boolean;
	tooltipTitle?: string;
	tooltipText?: string;
}

const props = withDefaults(defineProps<Props>(), {
	tooltip: true,
	tooltipTitle: undefined,
	tooltipText: undefined,
});

const i18n = useI18n();

const body = computed(() => props.tooltipText ?? i18n.baseText('credentials.private.tooltip'));
</script>

<template>
	<PongTooltip as-child :disabled="!tooltip" placement="top">
		<template #content>
			<div :class="$style.content">
				<strong v-if="tooltipTitle">{{ tooltipTitle }}</strong>
				<span>{{ body }}</span>
			</div>
		</template>
		<PongIcon v-bind="$attrs" data-test-id="private-credential-icon" icon="user-round-key" />
	</PongTooltip>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
