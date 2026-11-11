<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import {
	PongIcon,
	PongLink,
	PongOption,
	PongPreviewBadge,
	PongSelect,
	PongText,
	PongTooltip,
} from '@pong/design-system';
import { computed } from 'vue';
import { END_USER_CREDENTIALS_DOCS_URL } from '@/app/constants';

const props = withDefaults(
	defineProps<{
		// `true` = end-user (private) credential, `false` = fixed (static) credential.
		// Mirrors the `isResolvable` flag the rest of the modal uses.
		modelValue: boolean;
		// Explainer shown in the help tooltip next to the "Credential type" label.
		infoTip?: string;
		// When set the select is read-only and hovering shows `disabledTooltip`
		// (used when the current role can't change an end-user credential's type).
		disabled?: boolean;
	}>(),
	{
		infoTip: undefined,
		disabled: false,
	},
);

// Controlled component: the parent owns the value and may veto a change (confirm
// dialog), so we only emit the intent and let the prop drive the rendered state.
const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const i18n = useI18n();

type CredentialTypeValue = 'fixed' | 'endUser';

const selected = computed<CredentialTypeValue>(() => (props.modelValue ? 'endUser' : 'fixed'));

const options = computed(() => [
	{
		value: 'fixed' as const,
		icon: 'key-round' as const,
		title: i18n.baseText('credentialEdit.credentialConfig.credentialType.fixed.title'),
		subtitle: i18n.baseText('credentialEdit.credentialConfig.credentialType.fixed.subtitle'),
	},
	{
		value: 'endUser' as const,
		icon: 'user-round' as const,
		title: i18n.baseText('credentialEdit.credentialConfig.credentialType.endUser.title'),
		subtitle: i18n.baseText('credentialEdit.credentialConfig.credentialType.endUser.subtitle'),
	},
]);

function onSelect(value: string): void {
	const asBoolean = value === 'endUser';
	if (asBoolean === props.modelValue) return;
	emit('update:modelValue', asBoolean);
}
</script>

<template>
	<div :class="$style.container" data-test-id="credential-type-selector">
		<div :class="$style.header">
			<PongText size="medium" :bold="true">
				{{ i18n.baseText('credentialEdit.credentialConfig.credentialType.title') }}
			</PongText>
			<PongPreviewBadge size="xxsmall" />
			<PongTooltip v-if="infoTip" placement="top">
				<template #content>
					<div>
						{{ infoTip }}
						<PongLink bold :to="END_USER_CREDENTIALS_DOCS_URL" size="small">
							{{ i18n.baseText('generic.learnMore') }}
						</PongLink>
					</div>
				</template>
				<PongIcon icon="circle-help" size="small" color="text-light" />
			</PongTooltip>
		</div>

		<PongTooltip :disabled="!disabled" placement="top">
			<template #content>
				{{ i18n.baseText('credentialEdit.credentialConfig.credentialType.disabledTooltip') }}
			</template>
			<PongSelect
				:model-value="selected"
				:disabled="disabled"
				size="large"
				:teleported="false"
				:popper-class="$style.popper"
				data-test-id="credential-type-select"
				@update:model-value="onSelect"
			>
				<template #prefix>
					<PongIcon :icon="options.find((o) => o.value === selected)?.icon ?? 'key-round'" />
				</template>
				<PongOption
					v-for="option in options"
					:key="option.value"
					:value="option.value"
					:label="option.title"
					:data-test-id="`credential-type-option-${option.value}`"
				>
					<div :class="$style.option">
						<div :class="$style.optionTitle">
							<PongIcon :icon="option.icon" size="small" />
							<PongText size="medium" :bold="true">{{ option.title }}</PongText>
						</div>
						<PongText size="small" color="text-light" :class="$style.optionSubtitle">
							{{ option.subtitle }}
						</PongText>
					</div>
				</PongOption>
			</PongSelect>
		</PongTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	// Matches the label-to-input gap of medium PongInputLabel fields in the modal.
	gap: var(--spacing--2xs);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.popper {
	// Give the two-line options room to breathe.
	:global(.el-select-dropdown__item) {
		height: auto;
		line-height: var(--line-height--md);
		padding-top: var(--spacing--2xs);
		padding-bottom: var(--spacing--2xs);
	}
}

.option {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.optionTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.optionSubtitle {
	display: block;
	white-space: normal;
}
</style>
