<script lang="ts" setup>
import { PongAiActivityStep } from '@pong/design-system';
import { computed } from 'vue';

import { useInstanceContextLabel, type InstanceContextEntry } from '../instanceContextLabels';

const props = defineProps<{ entry: InstanceContextEntry }>();

const { getInstanceContextLabel } = useInstanceContextLabel();

const label = computed<string>(() => getInstanceContextLabel(props.entry));
</script>

<template>
	<PongAiActivityStep :label="label" :has-content="false" data-test-id="instance-ai-context-step" />
</template>
