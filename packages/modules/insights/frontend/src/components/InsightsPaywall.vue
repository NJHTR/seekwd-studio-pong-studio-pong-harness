<script lang="ts" setup>
import { PongButton, PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useBasePageRedirectionHelper } from '@pong/stores/composables/useBasePageRedirectionHelper';

const pageRedirectionHelper = useBasePageRedirectionHelper();
const i18n = useI18n();

const goToUpgrade = async () => {
	await pageRedirectionHelper.goToUpgrade('insights', 'upgrade-insights');
};
</script>

<template>
	<div :class="$style.callout">
		<PongIcon icon="lock" size="xlarge"></PongIcon>
		<PongText bold tag="h4" size="large">
			{{ i18n.baseText('insights.dashboard.paywall.title') }}
		</PongText>
		<PongText>
			{{ i18n.baseText('insights.dashboard.paywall.description') }}
		</PongText>
		<PongButton variant="solid" native-type="button" size="large" @click="goToUpgrade">
			{{ i18n.baseText('generic.upgrade') }}
		</PongButton>
	</div>
</template>

<style lang="scss" module>
.callout {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 6rem 0;
	align-items: center;
	max-width: 360px;
	margin: 0 auto;
	text-align: center;
	gap: 10px;
	justify-content: center;
}
</style>
