<script lang="ts">
import type { BannerName } from '@pong/api-types';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import V1Banner from './banners/V1Banner.vue';
import EmailConfirmationBanner from './banners/EmailConfirmationBanner.vue';
import DataTableStorageLimitWarningBanner from './banners/DataTableStorageLimitWarningBanner.vue';
import DataTableStorageLimitErrorBanner from './banners/DataTableStorageLimitErrorBanner.vue';
import WorkflowAutoDeactivatedBanner from './banners/WorkflowAutoDeactivatedBanner.vue';
import type { Component } from 'vue';
import type { PongBanners } from '../banners.types';

// All banners that can be shown in the app should be registered here.
// This component renders the banner with the highest priority from the banner stack, located in the banners store.
// This local build has no plans or licenses, so trial and license banners are not registered.
export const PONG_BANNERS: PongBanners = {
	V1: { priority: 350, component: V1Banner as Component },
	WORKFLOW_AUTO_DEACTIVATED: {
		priority: 340,
		component: WorkflowAutoDeactivatedBanner as Component,
	},
	EMAIL_CONFIRMATION: { priority: 250, component: EmailConfirmationBanner as Component },
	DATA_TABLE_STORAGE_LIMIT_WARNING: {
		priority: 300,
		component: DataTableStorageLimitWarningBanner as Component,
	},
	DATA_TABLE_STORAGE_LIMIT_ERROR: {
		priority: 400,
		component: DataTableStorageLimitErrorBanner as Component,
	},
};
</script>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { getBannerRowHeight } from '@/app/utils/htmlUtils';

const bannersStore = useBannersStore();

async function updateCurrentBannerHeight() {
	const bannerHeight = await getBannerRowHeight();
	bannersStore.updateBannersHeight(bannerHeight);
}

const getBannerForName = (bannerName: BannerName) => {
	return PONG_BANNERS[bannerName] || bannersStore.dynamicBannersMap[bannerName];
};

const removeUndefinedValues = (obj: Record<string, unknown>) => {
	return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== undefined));
};

const currentlyShownBanner = computed(() => {
	void updateCurrentBannerHeight();
	if (bannersStore.bannerStack.length === 0) return null;

	// Only consider banners that are still registered (plan and license banners are not).
	const registered = bannersStore.bannerStack.filter((bannerName) => getBannerForName(bannerName));
	if (registered.length === 0) return null;

	// Find the banner with the highest priority
	let currentBanner = getBannerForName(registered[0])!;
	let currentBannerName = registered[0];
	registered.forEach((bannerName, index) => {
		if (index === 0) return;
		const bannerToCompare = getBannerForName(bannerName)!;
		if (bannerToCompare.priority > currentBanner.priority) {
			currentBanner = bannerToCompare;
			currentBannerName = bannerName;
		}
	});

	return {
		component: currentBanner.component,
		props: removeUndefinedValues({
			name: currentBannerName,
			content: currentBanner.content,
			theme: currentBanner.theme,
			isDismissible: currentBanner.isDismissible,
			dismissPermanently: currentBanner.dismissPermanently,
		}),
	};
});

onMounted(async () => {
	await updateCurrentBannerHeight();
});
</script>

<template>
	<div data-test-id="banner-stack">
		<component
			:is="currentlyShownBanner.component"
			v-if="currentlyShownBanner"
			v-bind="currentlyShownBanner.props"
		/>
	</div>
</template>
