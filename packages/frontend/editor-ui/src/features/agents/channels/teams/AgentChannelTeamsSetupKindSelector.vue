<script setup lang="ts">
import { PongOption, PongSelect } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

import type { AgentChannelRuntime } from '../types';
import AgentChannelTeamsOptionLabel from './AgentChannelTeamsOptionLabel.vue';
import { isTeamsChannelRuntime, type TeamsSetupKind } from './useTeamsChannelRuntime';

const props = defineProps<{
	runtime: AgentChannelRuntime;
	disabled?: boolean;
}>();

const i18n = useI18n();

const visible = computed(
	() =>
		isTeamsChannelRuntime(props.runtime) && props.runtime.managedSetup.value.managedSetupAvailable,
);

const setupKind = computed<TeamsSetupKind>({
	get: () => (isTeamsChannelRuntime(props.runtime) ? props.runtime.setupKind.value : 'managed'),
	set: (value) => {
		if (isTeamsChannelRuntime(props.runtime)) {
			props.runtime.setupKind.value = value;
		}
	},
});

const options = computed(() => [
	{
		value: 'managed',
		label: i18n.baseText('agents.channels.teams.setupKind.recommended'),
		description: i18n.baseText('agents.channels.teams.setupKind.recommendedDescription'),
	},
	{
		value: 'manual',
		label: i18n.baseText('agents.channels.teams.setupKind.manual'),
		description: i18n.baseText('agents.channels.teams.setupKind.manualDescription'),
	},
]);
</script>

<template>
	<PongSelect
		v-if="visible"
		v-model="setupKind"
		:class="$style.teamsSetupKindSelector"
		:disabled="disabled"
		size="medium"
		:teleported="false"
		data-testid="teams-setup-kind-selector"
	>
		<PongOption v-for="opt in options" :key="opt.value" :value="opt.value" :label="opt.label">
			<AgentChannelTeamsOptionLabel :label="opt.label" :description="opt.description" />
		</PongOption>
	</PongSelect>
</template>

<style module lang="scss">
.teamsSetupKindSelector {
	--input--radius: var(--radius--xs);

	width: 240px;
}
</style>
