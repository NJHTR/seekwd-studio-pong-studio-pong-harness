<script setup lang="ts">
import { PROMOTION_COMMIT_MESSAGE_MAX_LENGTH } from '@pong/api-types';
import { PongInput, PongInputLabel } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useTemplateRef } from 'vue';

import PromotionCharacterCount from './PromotionCharacterCount.vue';

defineProps<{ disabled?: boolean }>();

/** Optional. The backend generates the message when the trimmed value is empty. */
const commitMessage = defineModel<string>({ required: true });

const i18n = useI18n();
const input = useTemplateRef<InstanceType<typeof PongInput>>('input');

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
	<PongInputLabel
		input-name="promote-commit-message"
		:label="i18n.baseText('promotions.commitMessage.label')"
	>
		<PongInput
			id="promote-commit-message"
			ref="input"
			v-model="commitMessage"
			type="textarea"
			:rows="3"
			:maxlength="PROMOTION_COMMIT_MESSAGE_MAX_LENGTH"
			:disabled="disabled"
			:placeholder="i18n.baseText('promotions.commitMessage.placeholder')"
			data-test-id="promote-commit-message"
		/>
		<PromotionCharacterCount
			:value="commitMessage"
			:max="PROMOTION_COMMIT_MESSAGE_MAX_LENGTH"
			data-test-id="promote-commit-message-character-count"
		/>
	</PongInputLabel>
</template>
