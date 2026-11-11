<script setup lang="ts">
import { computed, ref } from 'vue';
import { useClipboard } from '@pong/composables/useClipboard';
import { useI18n } from '@pong/i18n';
import { PongIconButton, PongTooltip } from '@pong/design-system';

const { content } = defineProps<{ content: string }>();

const i18n = useI18n();
const clipboard = useClipboard();
const justCopied = ref(false);
const copyTooltip = computed(() => {
	return justCopied.value ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy');
});

async function handleCopy() {
	await clipboard.copy(content);
	justCopied.value = true;
	setTimeout(() => {
		justCopied.value = false;
	}, 1000);
}
</script>

<template>
	<PongTooltip placement="bottom" :show-after="300">
		<PongIconButton
			variant="ghost"
			:icon="justCopied ? 'check' : 'copy'"
			size="small"
			icon-size="medium"
			:class="$style.button"
			tabindex="0"
			:aria-label="copyTooltip"
			@click="handleCopy"
		/>
		<template #content>{{ copyTooltip }}</template>
	</PongTooltip>
</template>

<style lang="scss" module>
.button {
	& g,
	& path {
		color: var(--color--text--tint-1);
		stroke-width: 2.5;
	}
}
</style>
