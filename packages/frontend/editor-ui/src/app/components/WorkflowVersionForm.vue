<script setup lang="ts">
import {
	WORKFLOW_VERSION_NAME_MAX_LENGTH,
	WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH,
} from '@pong/api-types';
import { PongInput, PongInputLabel } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useTemplateRef } from 'vue';

import CharacterCount from '@/app/components/CharacterCount.vue';

defineProps<{
	disabled?: boolean;
	nameRequired?: boolean;
	versionNameTestId?: string;
	descriptionTestId?: string;
}>();

const versionName = defineModel<string>('versionName', { required: true });
const description = defineModel<string>('description', { required: true });
const nameInputRef = useTemplateRef<InstanceType<typeof PongInput>>('nameInput');

const i18n = useI18n();

const emit = defineEmits<{
	submit: [];
}>();

const focusInput = () => {
	nameInputRef.value?.select();
};

const handleEnterKey = () => {
	emit('submit');
};

defineExpose({
	focusInput,
});
</script>

<template>
	<div :class="$style.formContainer">
		<PongInputLabel
			input-name="workflow-version-name"
			:label="i18n.baseText('workflows.publishModal.versionNameLabel')"
			:required="nameRequired ?? true"
			:class="$style.inputWrapper"
		>
			<PongInput
				id="workflow-version-name"
				ref="nameInput"
				v-model="versionName"
				:disabled="disabled"
				size="large"
				:maxlength="WORKFLOW_VERSION_NAME_MAX_LENGTH"
				:data-test-id="versionNameTestId"
				@keydown.enter.prevent="handleEnterKey"
			/>
			<CharacterCount
				:value="versionName"
				:max="WORKFLOW_VERSION_NAME_MAX_LENGTH"
				data-test-id="workflow-version-name-character-count"
			/>
		</PongInputLabel>
		<PongInputLabel
			input-name="workflow-version-description"
			:label="i18n.baseText('workflows.publishModal.descriptionPlaceholder')"
		>
			<PongInput
				id="workflow-version-description"
				v-model="description"
				type="textarea"
				:rows="4"
				:disabled="disabled"
				size="large"
				:maxlength="WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH"
				:data-test-id="descriptionTestId"
			/>
			<CharacterCount
				:value="description"
				:max="WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH"
				data-test-id="workflow-version-description-character-count"
			/>
		</PongInputLabel>
	</div>
</template>

<style lang="scss" module>
.formContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.inputWrapper {
	width: 100%;
}
</style>
