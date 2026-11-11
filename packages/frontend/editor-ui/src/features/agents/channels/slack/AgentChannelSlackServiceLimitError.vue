<script setup lang="ts">
import { PongLink, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import { SLACK_APP_DASHBOARD_URL } from './constants';

const i18n = useI18n();
</script>

<template>
	<PongText size="small" :class="$style.error" data-testid="slack-managed-service-limit-error">
		{{ i18n.baseText('agents.channels.slack.managed.serviceLimitsExceeded.message') }}
		<PongLink
			:href="SLACK_APP_DASHBOARD_URL"
			target="_blank"
			rel="noopener noreferrer"
			size="small"
			data-testid="slack-managed-service-limit-link"
		>
			{{ i18n.baseText('agents.channels.slack.managed.serviceLimitsExceeded.openDashboard') }}
		</PongLink>
	</PongText>
</template>

<style module lang="scss">
.error {
	color: var(--text-color--danger);
}
</style>
