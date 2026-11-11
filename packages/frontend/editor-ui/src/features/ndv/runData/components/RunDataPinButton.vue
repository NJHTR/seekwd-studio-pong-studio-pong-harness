<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@pong/i18n';
import type { usePinnedData } from '@/app/composables/usePinnedData';
import { PongIconButton, PongLink, PongText, PongTooltip } from '@pong/design-system';
const locale = useI18n();

type Props = {
	tooltipContentsVisibility: {
		binaryDataTooltipContent: boolean;
		pinDataDiscoveryTooltipContent: boolean;
	};
	dataPinningDocsUrl: string;
	pinnedData: ReturnType<typeof usePinnedData>;
	disabled: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	togglePinData: [];
}>();

const visible = computed(() =>
	props.tooltipContentsVisibility.pinDataDiscoveryTooltipContent ? true : undefined,
);
</script>

<template>
	<PongTooltip placement="bottom-end" :visible="visible">
		<template #content>
			<div v-if="props.tooltipContentsVisibility.binaryDataTooltipContent">
				{{ locale.baseText('ndv.pinData.pin.binary') }}
			</div>
			<div v-else-if="props.tooltipContentsVisibility.pinDataDiscoveryTooltipContent">
				{{ locale.baseText('node.discovery.pinData.ndv') }}
			</div>
			<div v-else>
				<div v-if="pinnedData.hasData.value">
					<strong>{{ locale.baseText('ndv.pinData.unpin.title') }}</strong>
				</div>
				<div v-else>
					<strong>{{ locale.baseText('ndv.pinData.pin.title') }}</strong>
					<PongText size="small" tag="p">
						{{ locale.baseText('ndv.pinData.pin.description') }}

						<PongLink :to="props.dataPinningDocsUrl" size="small">
							{{ locale.baseText('ndv.pinData.pin.link') }}
						</PongLink>
					</PongText>
				</div>
			</div>
		</template>
		<PongIconButton
			variant="outline"
			size="small"
			:class="$style.pinDataButton"
			:active="props.pinnedData.hasData.value"
			icon="pin"
			:aria-label="
				locale.baseText(
					pinnedData.hasData.value ? 'ndv.pinData.unpin.title' : 'ndv.pinData.pin.title',
				)
			"
			:disabled="props.disabled"
			data-test-id="ndv-pin-data"
			@click="emit('togglePinData')"
		/>
	</PongTooltip>
</template>

<style lang="scss" module>
.pinDataButton {
	svg {
		transition: transform 0.3s ease;
	}
}
</style>
