<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/features/settings/usage/usage.constants';
import { useUIStore } from '@/app/stores/ui.store';

import { PongEmptyState } from '@pong/design-system';
const i18n = useI18n();
const uiStore = useUIStore();

const goToUpgrade = async () => {
	uiStore.openModalWithData({
		name: COMMUNITY_PLUS_ENROLLMENT_MODAL,
		data: {
			customHeading: undefined,
		},
	});
};
</script>

<template>
	<PongEmptyState
		data-test-id="evaluations-unlicensed"
		:heading="i18n.baseText('evaluations.paywall.title')"
		:description="i18n.baseText('evaluations.paywall.description')"
		:button-text="i18n.baseText('evaluations.paywall.cta')"
		@click="goToUpgrade"
	></PongEmptyState>
</template>
