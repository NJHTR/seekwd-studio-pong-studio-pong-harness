<script setup lang="ts">
import { PongIcon, type AiModelSelectorMenuItem } from '@pong/design-system';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';

defineProps<{
	item: AiModelSelectorMenuItem;
}>();
</script>

<template>
	<PongIcon v-if="item.data?.leadingIcon" :icon="item.data.leadingIcon" size="large" />
	<CredentialIcon
		v-else-if="item.data?.credentialType"
		:credential-type-name="item.data.credentialType"
		:size="16"
	/>
</template>
