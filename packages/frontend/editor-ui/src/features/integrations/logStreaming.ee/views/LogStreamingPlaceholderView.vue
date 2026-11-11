<script lang="ts" setup>
import { onMounted } from 'vue';
import { useI18n } from '@pong/i18n';
import { PongHeading } from '@pong/design-system';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import LogStreamingPaywall from '@/features/integrations/logStreaming.ee/components/LogStreamingPaywall.vue';

const i18n = useI18n();
const documentTitle = useDocumentTitle();

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.log-streaming.heading'));
});
</script>

<template>
	<div>
		<div class="mb-2xl">
			<PongHeading size="2xlarge">
				{{ i18n.baseText('settings.log-streaming.heading') }}
			</PongHeading>
		</div>
		<LogStreamingPaywall />
	</div>
</template>
