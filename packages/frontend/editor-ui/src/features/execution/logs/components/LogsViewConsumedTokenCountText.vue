<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import { type LlmTokenUsageData } from '@/Interface';
import { formatTokenUsageCount } from '@/app/utils/aiUtils';
import { PongTooltip } from '@pong/design-system';
import ConsumedTokensDetails from '@/app/components/ConsumedTokensDetails.vue';
const { consumedTokens } = defineProps<{ consumedTokens: LlmTokenUsageData }>();
const locale = useI18n();
</script>

<template>
	<PongTooltip v-if="consumedTokens !== undefined" :enterable="false">
		<span>{{
			locale.baseText('runData.aiContentBlock.tokens', {
				interpolate: {
					count: formatTokenUsageCount(consumedTokens, 'total'),
				},
			})
		}}</span>
		<template #content>
			<ConsumedTokensDetails :consumed-tokens="consumedTokens" />
		</template>
	</PongTooltip>
</template>
