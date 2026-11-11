<script setup lang="ts">
import { PongCallout } from '@pong/design-system';

defineProps<{ text: string }>();
</script>

<template>
	<PongCallout theme="secondary" iconless data-test-id="gateway-credits-promotion">
		{{ text }}
	</PongCallout>
</template>
