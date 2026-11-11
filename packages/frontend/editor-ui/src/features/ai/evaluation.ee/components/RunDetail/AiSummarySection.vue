<script setup lang="ts">
// TODO(TRUST-70 follow-up): replace this stub with real AI-generated summary.
// Plug-in points for the data layer:
//   1. Backend service that calls an LLM with run metrics + deltas to produce
//      `summary` and `recommendation` text.
//   2. New endpoint or extension to the existing run detail response carrying
//      the cached summary.
//   3. A regenerate-on-demand action wired to the refresh affordance below.
import { useI18n } from '@pong/i18n';
import { PongHeading, PongText } from '@pong/design-system';

const locale = useI18n();
</script>

<template>
	<section :class="$style.container" data-test-id="ai-summary-section">
		<PongHeading size="medium" :class="$style.title">
			{{ locale.baseText('evaluation.runDetail.aiSummary.title') }}
		</PongHeading>
		<PongText size="medium" :class="$style.placeholder">
			{{ locale.baseText('evaluation.runDetail.aiSummary.placeholder') }}
		</PongText>
	</section>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: var(--spacing--lg) 0;
}

.title {
	color: var(--color--text);
}

.placeholder {
	color: var(--color--text--tint-1);
	font-style: italic;
}
</style>
