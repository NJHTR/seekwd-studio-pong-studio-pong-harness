<script lang="ts" setup>
import { PongAiActivityStep } from '@pong/design-system';
import { computed } from 'vue';

import type { AgentsChatHostEvent } from '@/features/ai/shared/agentsChat/types';

import { useInstanceContextLabel } from '../instanceContextLabels';
import { parseInstanceContextHostEvent } from './assistantHostEvents';

const props = defineProps<{ event: AgentsChatHostEvent }>();

const { getInstanceContextLabel } = useInstanceContextLabel();

const label = computed(() => {
	const summary = parseInstanceContextHostEvent(props.event);
	return summary ? getInstanceContextLabel(summary) : '';
});
</script>

<template>
	<PongAiActivityStep
		v-if="label"
		:label="label"
		:has-content="false"
		data-test-id="assistant-agent-instance-context"
	/>
</template>
