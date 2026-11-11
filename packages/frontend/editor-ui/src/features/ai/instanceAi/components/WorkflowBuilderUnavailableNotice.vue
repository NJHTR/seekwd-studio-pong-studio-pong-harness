<script lang="ts" setup>
import { computed } from 'vue';
import { PongCallout } from '@pong/design-system';
import { useI18n, type BaseTextKey } from '@pong/i18n';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

const i18n = useI18n();
const settingsStore = useInstanceAiSettingsStore();

const descriptionKey = computed<BaseTextKey>(() =>
	settingsStore.isSandboxEnabled
		? ('instanceAi.workflowBuilderUnavailable.serviceUrlDescription' as BaseTextKey)
		: ('instanceAi.workflowBuilderUnavailable.enableSandboxDescription' as BaseTextKey),
);
</script>

<template>
	<PongCallout
		:class="$style.notice"
		theme="warning"
		data-test-id="instance-ai-workflow-builder-unavailable"
	>
		<span :class="$style.copy">
			<strong>{{ i18n.baseText('instanceAi.workflowBuilderUnavailable.title') }}</strong>
			<span>{{ i18n.baseText(descriptionKey) }}</span>
		</span>
	</PongCallout>
</template>

<style lang="scss" module>
.notice {
	width: 100%;
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
