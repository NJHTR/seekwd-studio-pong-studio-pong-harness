<script setup lang="ts">
import { useVersionsStore } from '@pong/stores/versions.store';
import { useI18n } from '@pong/i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useTelemetry } from '@pong/composables/useTelemetry';
import { PongMenuItem } from '@pong/design-system';

interface Props {
	disabled?: boolean;
	tooltipText?: string;
}

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	tooltipText: undefined,
});

const i18n = useI18n();
const versionsStore = useVersionsStore();

const pageRedirectionHelper = usePageRedirectionHelper();
const telemetry = useTelemetry();

const onUpdateClick = async () => {
	telemetry.track('User clicked on update button', {
		source: 'main-sidebar',
	});

	await pageRedirectionHelper.goToVersions();
};
</script>

<template>
	<PongMenuItem
		data-test-id="version-update-cta-button"
		:item="{
			id: 'version-update-cta',
			icon: { value: 'status-warning', type: 'icon', color: 'primary' },
			disabled: props.disabled,
			disabledReason: props.tooltipText,
			label: i18n.baseText('whatsNew.versionsBehind', {
				interpolate: {
					count: versionsStore.nextVersions.length > 99 ? '99+' : versionsStore.nextVersions.length,
				},
			}),
		}"
		@click="onUpdateClick"
	/>
</template>
