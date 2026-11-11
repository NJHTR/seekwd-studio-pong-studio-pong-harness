<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { PongButton, PongCallout, PongHeading, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { isBrowserUseSupportedForBrowser } from '../../utils/browserUseSupport';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import { useInstanceAiBrowserUseTelemetry } from '../../instanceAiBrowserUse.telemetry';
import BrowserUseConnectStep from './BrowserUseConnectStep.vue';

import { CHROME_EXTENSION_URL } from '../../constants';
import {
	detectBrowserUseExtension,
	type BrowserUseExtensionState,
} from '../../utils/browserUseExtension';

const props = withDefaults(
	defineProps<{
		embedded?: boolean;
		autoConnect?: boolean;
	}>(),
	{
		embedded: false,
		autoConnect: false,
	},
);

const emit = defineEmits<{ close: [] }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
const telemetry = useInstanceAiBrowserUseTelemetry();
const { onDocumentVisible } = useDocumentVisibility();

const isBrowserSupported = isBrowserUseSupportedForBrowser();
const isConnected = computed(() => store.browserConnected);
const statusChecked = ref(false);
const extensionState = ref<BrowserUseExtensionState>('unknown');
const isExtensionMissing = computed(() => extensionState.value === 'not-installed');
const isExtensionInstalled = computed(() => extensionState.value === 'installed');
let isProbingExtension = false;

async function refreshExtensionState(): Promise<void> {
	// Returning to the tab can fire both triggers below, so skip a probe while one is in flight.
	if (!isBrowserSupported || store.browserConnected || isProbingExtension) return;

	isProbingExtension = true;
	try {
		extensionState.value = await detectBrowserUseExtension();
	} finally {
		isProbingExtension = false;
	}
}

onMounted(async () => {
	if (!isBrowserSupported) return;
	await Promise.all([refreshExtensionState(), store.fetchBrowserStatus()]);
	statusChecked.value = true;
});

// Re-probe when the user returns from installing the extension. Coming back by tab switch
// only fires `visibilitychange` — the window's focus can land in DevTools or another pane —
// while coming back from a separate window only fires `focus`, so we listen for both.
const reprobeExtension = () => {
	void refreshExtensionState();
};
onDocumentVisible(reprobeExtension);
useEventListener(window, 'focus', reprobeExtension);
</script>

<template>
	<div :class="[$style.body, props.embedded && $style.bodyEmbedded]">
		<div v-if="!props.embedded" :class="$style.header">
			<PongHeading tag="h2" size="large" :class="$style.title">
				{{ i18n.baseText('instanceAi.browserUse.modal.title') }}
			</PongHeading>
		</div>

		<template v-if="!isBrowserSupported">
			<PongCallout theme="warning" data-test-id="browser-use-unsupported-browser">
				{{ i18n.baseText('instanceAi.browserUse.unsupportedBrowser') }}
			</PongCallout>
			<div v-if="!props.embedded" :class="$style.footer">
				<PongButton
					:label="i18n.baseText('generic.close')"
					variant="outline"
					size="medium"
					data-test-id="browser-use-unsupported-close"
					@click="emit('close')"
				/>
			</div>
		</template>

		<template v-else-if="isConnected">
			<div :class="$style.statusRow">
				<span :class="[$style.statusDot, $style.statusDotConnected]" />
				<PongText size="small" :bold="true">
					{{ i18n.baseText('instanceAi.browserUse.connected') }}
				</PongText>
			</div>
			<PongText color="text-light" :class="$style.description">
				{{ i18n.baseText('instanceAi.browserUse.connected.description') }}
			</PongText>
		</template>

		<template v-else>
			<PongText color="text-light" :class="$style.description">
				{{ i18n.baseText('instanceAi.browserUse.modal.description') }}
			</PongText>

			<div v-if="!isExtensionInstalled" :class="$style.step">
				<PongText :bold="true" size="small">
					{{ i18n.baseText('instanceAi.browserUse.step.extension.title') }}
				</PongText>
				<PongText color="text-light" size="small">
					{{ i18n.baseText('instanceAi.browserUse.step.extension.description') }}
				</PongText>
				<PongButton
					:label="i18n.baseText('instanceAi.browserUse.step.extension.cta')"
					:href="CHROME_EXTENSION_URL"
					target="_blank"
					:variant="isExtensionMissing ? 'solid' : 'outline'"
					size="medium"
					icon="external-link"
					data-test-id="browser-use-install-extension"
					@click="telemetry.trackInstallExtensionClicked"
				/>
			</div>

			<div v-if="isExtensionMissing" :class="$style.step">
				<PongText :bold="true" size="small">
					{{ i18n.baseText('instanceAi.browserUse.step.connect.title') }}
				</PongText>
				<PongText color="text-light" size="small" data-test-id="browser-use-extension-missing-note">
					{{ i18n.baseText('instanceAi.browserUse.step.connect.extensionMissing') }}
				</PongText>
			</div>

			<div v-else-if="statusChecked" :class="$style.step">
				<BrowserUseConnectStep :auto-connect="props.autoConnect" />
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.bodyEmbedded {
	padding: 0;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.title {
	margin: 0;
	font-size: var(--font-size--xl);
}

.description {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.step {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--color--background--light-2);
	border-radius: var(--radius);
}

.footer {
	display: flex;
	justify-content: flex-end;
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.statusDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	flex-shrink: 0;
}

.statusDotConnected {
	background: var(--color--success);
}
</style>
