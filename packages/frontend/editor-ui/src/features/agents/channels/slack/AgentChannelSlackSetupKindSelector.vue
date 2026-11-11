<script setup lang="ts">
import { PongOption, PongSelect } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

import type { AgentChannelRuntime } from '../types';
import { isSlackChannelRuntime, type SlackSetupKind } from './useSlackChannelRuntime';

const props = defineProps<{
	runtime: AgentChannelRuntime;
	disabled?: boolean;
}>();

const i18n = useI18n();

const visible = computed(
	() => isSlackChannelRuntime(props.runtime) && props.runtime.setup.value.managedSetupAvailable,
);

const setupKind = computed<SlackSetupKind>({
	get: () => (isSlackChannelRuntime(props.runtime) ? props.runtime.setupKind.value : 'managed'),
	set: (value) => {
		if (isSlackChannelRuntime(props.runtime)) {
			props.runtime.setupKind.value = value;
		}
	},
});
</script>

<template>
	<PongSelect
		v-if="visible"
		v-model="setupKind"
		:class="$style.slackSetupKindSelector"
		:disabled="disabled"
		size="medium"
		:teleported="false"
		data-testid="slack-setup-kind-selector"
	>
		<PongOption
			value="managed"
			:label="i18n.baseText('agents.channels.slack.setupKind.recommended')"
		/>
		<PongOption value="manual" :label="i18n.baseText('agents.channels.slack.setupKind.manual')" />
	</PongSelect>
</template>

<style module lang="scss">
.slackSetupKindSelector {
	--input--radius: var(--radius--xs);

	width: 240px;
}
</style>
