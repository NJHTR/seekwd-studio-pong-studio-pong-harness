<script setup lang="ts">
import {
	PongButton,
	PongInputLabel,
	PongOption,
	PongSelect,
	PongSpinner,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import type { INodeProperties } from 'pong-workflow';
import { computed, useId } from 'vue';

import {
	useCredentialOptions,
	type CredentialOptionsContext,
} from '../../composables/useCredentialOptions';

const props = defineProps<
	CredentialOptionsContext & {
		parameter: INodeProperties;
		modelValue: string;
		showValidationWarnings?: boolean;
		compact?: boolean;
	}
>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const i18n = useI18n();
const inputId = useId();
const {
	options: loadedOptions,
	loading,
	errorMessage,
	filter,
	hasMore,
	search,
	loadMore,
} = useCredentialOptions(props);
const options = computed(() => {
	const staticOptions = props.parameter.options?.filter((option) => 'value' in option) ?? [];
	const query = filter.value.toLowerCase();
	return [
		...staticOptions.filter((option) => option.name.toLowerCase().includes(query)),
		...loadedOptions.value,
	];
});
const hasRequiredError = computed(
	() => props.parameter.required && props.showValidationWarnings && !props.modelValue,
);
const fieldError = computed(() => {
	if (hasRequiredError.value) {
		return i18n.baseText('parameterInputExpanded.thisFieldIsRequired');
	}
	if (errorMessage.value) {
		return i18n.baseText('credentialEdit.options.error', {
			interpolate: { message: errorMessage.value },
		});
	}
	return '';
});
</script>

<template>
	<PongInputLabel
		:input-name="inputId"
		:label="i18n.credText(credentialType ?? '').inputLabelDisplayName(parameter)"
		:tooltip-text="i18n.credText(credentialType ?? '').inputLabelDescription(parameter)"
		:bold="!compact"
		:size="compact ? 'small' : 'medium'"
		show-tooltip
	>
		<PongSelect
			:id="inputId"
			:model-value="modelValue"
			:size="compact ? 'small' : 'large'"
			:placeholder="parameter.placeholder"
			:teleported="false"
			:no-data-text="i18n.baseText('credentialEdit.options.empty')"
			:aria-invalid="Boolean(hasRequiredError)"
			:aria-busy="loading || undefined"
			:aria-describedby="fieldError ? `${inputId}-error` : undefined"
			filterable
			remote
			remote-show-suffix
			:remote-method="search"
			default-first-option
			@update:model-value="emit('update:modelValue', $event)"
		>
			<template v-if="loading" #prefix>
				<PongSpinner role="status" :aria-label="i18n.baseText('parameterInput.loadingOptions')" />
			</template>
			<PongOption
				v-for="option in options"
				:key="String(option.value)"
				:value="String(option.value)"
				:label="option.name"
			/>
			<template v-if="hasMore" #footer>
				<PongButton
					variant="ghost"
					size="small"
					:label="i18n.baseText('credentialEdit.options.loadMore')"
					:disabled="loading"
					@mousedown.prevent
					@click.stop="loadMore"
				/>
			</template>
		</PongSelect>
		<PongText
			v-if="fieldError"
			:id="`${inputId}-error`"
			class="mt-2xs"
			size="small"
			color="danger"
			role="alert"
		>
			{{ fieldError }}
		</PongText>
	</PongInputLabel>
</template>
