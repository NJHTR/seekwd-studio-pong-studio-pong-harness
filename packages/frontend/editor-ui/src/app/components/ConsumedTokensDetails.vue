<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import { type LlmTokenUsageData } from '@/Interface';
import { formatTokenUsageCount } from '@/app/utils/aiUtils';
import { PongText } from '@pong/design-system';
const { consumedTokens } = defineProps<{ consumedTokens: LlmTokenUsageData }>();
const i18n = useI18n();
</script>

<template>
	<div>
		<PongText :bold="true" size="small">
			{{ i18n.baseText('runData.aiContentBlock.tokens.prompt') }}
			{{
				i18n.baseText('runData.aiContentBlock.tokens', {
					interpolate: {
						count: formatTokenUsageCount(consumedTokens, 'prompt'),
					},
				})
			}}
		</PongText>
		<br />
		<PongText :bold="true" size="small">
			{{ i18n.baseText('runData.aiContentBlock.tokens.completion') }}
			{{
				i18n.baseText('runData.aiContentBlock.tokens', {
					interpolate: {
						count: formatTokenUsageCount(consumedTokens, 'completion'),
					},
				})
			}}
		</PongText>
	</div>
</template>
