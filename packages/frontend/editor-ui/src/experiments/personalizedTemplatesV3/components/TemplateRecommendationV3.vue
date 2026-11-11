<script setup lang="ts">
import { usePersonalizedTemplatesV3Store } from '../stores/personalizedTemplatesV3.store';
import NodeRecommendationCard from './NodeRecommendationCard.vue';
import { useI18n } from '@pong/i18n';
import { PongHeading } from '@pong/design-system';

const personalizedTemplateStore = usePersonalizedTemplatesV3Store();
const locale = useI18n();
</script>

<template>
	<div
		v-if="personalizedTemplateStore.hasChosenHubSpot"
		class="text-center mt-3xl"
		data-test-id="list-empty-state"
	>
		<PongHeading tag="h2" size="medium" class="mb-2xs" color="text-light">
			{{ locale.baseText('experiments.personalizedTemplatesV3.exploreTemplates') }}
		</PongHeading>
		<div :class="$style.nodeCardsContainer">
			<NodeRecommendationCard node-name="pong-nodes-base.hubspot" />
		</div>
	</div>
</template>

<style lang="scss" module>
.nodeCardsContainer {
	display: flex;
	justify-content: center;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--xl);
}
</style>
