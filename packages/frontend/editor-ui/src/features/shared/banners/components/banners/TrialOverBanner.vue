<script lang="ts" setup>
import BaseBanner from './BaseBanner.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { i18n as locale } from '@pong/i18n';

import { PongButton } from '@pong/design-system';

const pageRedirectionHelper = usePageRedirectionHelper();

function onUpgradePlanClick() {
	void pageRedirectionHelper.goToUpgrade('canvas-nav', 'upgrade-canvas-nav', 'redirect');
}
</script>

<template>
	<BaseBanner custom-icon="info" theme="warning" name="TRIAL_OVER">
		<template #mainContent>
			<span>{{ locale.baseText('banners.trialOver.message') }}</span>
		</template>
		<template #trailingContent>
			<PongButton
				class="pong-button--success"
				variant="solid"
				icon="zap"
				size="small"
				@click="onUpgradePlanClick"
				>{{ locale.baseText('generic.upgradeNow') }}</PongButton
			>
		</template>
	</BaseBanner>
</template>
