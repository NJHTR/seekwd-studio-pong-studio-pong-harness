<script lang="ts" setup>
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { computed, useSlots } from 'vue';
import type { BannerName } from '@pong/api-types';
import { useI18n } from '@pong/i18n';
import type { CalloutTheme } from '@pong/design-system';
import { type IconName } from '@pong/design-system';

import { PongCallout, PongIcon } from '@pong/design-system';
interface Props {
	name: BannerName;
	theme?: CalloutTheme;
	customIcon?: IconName;
	iconTooltip?: string;
	dismissible?: boolean;
	dismissPermanently?: boolean;
}

const i18n = useI18n();

const bannersStore = useBannersStore();
const slots = useSlots();

const props = withDefaults(defineProps<Props>(), {
	theme: 'info',
	dismissible: true,
	customIcon: undefined,
	iconTooltip: undefined,
	dismissPermanently: false,
});

const emit = defineEmits<{
	close: [];
}>();

const hasTrailingContent = computed(() => {
	return !!slots.trailingContent;
});

async function onCloseClick() {
	await bannersStore.dismissBanner(
		props.name,
		props.dismissPermanently ? 'permanent' : 'temporary',
	);
	emit('close');
}
</script>
<template>
	<PongCallout
		:class="$style.callout"
		:theme="props.theme"
		:icon="props.customIcon"
		:icon-tooltip="props.iconTooltip"
		icon-size="medium"
		:round-corners="false"
		:data-test-id="`banners-${props.name}`"
		:only-bottom-border="true"
	>
		<div :class="[$style.mainContent, !hasTrailingContent ? $style.keepSpace : '']">
			<slot name="mainContent" />
		</div>
		<template #trailingContent>
			<div :class="$style.trailingContent">
				<slot name="trailingContent" />
				<PongIcon
					v-if="dismissible"
					size="small"
					icon="x"
					:title="i18n.baseText('generic.dismiss')"
					class="clickable"
					:data-test-id="`banner-${props.name}-close`"
					@click="onCloseClick"
				/>
			</div>
		</template>
	</PongCallout>
</template>

<style lang="scss" module>
.callout {
	height: var(--banner--height);
}

.mainContent {
	display: flex;
	gap: var(--spacing--4xs);
}

.keepSpace {
	padding: 5px 0;
}
.trailingContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--lg);
}
</style>
