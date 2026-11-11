<script setup lang="ts">
import { PongButton, PongIcon } from '@pong/design-system';

import { useI18n } from '@mcp-apps/i18n';

withDefaults(
	defineProps<{
		label?: string;
		variant?: 'solid' | 'outline';
		size?: 'small' | 'medium';
	}>(),
	{
		variant: 'outline',
		size: 'small',
	},
);

const emit = defineEmits<{
	click: [];
}>();

const { t } = useI18n();
</script>

<template>
	<PongButton :variant="variant" :size="size" @click="emit('click')">
		{{ label ?? t('workflowPreview.openButton') }}
		<template #icon>
			<PongIcon icon="arrow-up-right" />
		</template>
	</PongButton>
</template>
