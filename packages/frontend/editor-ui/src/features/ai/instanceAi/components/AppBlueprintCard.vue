<script setup lang="ts">
import {
	appNameSchema,
	appNamespaceSchema,
	type AppBlueprint,
	type AppBlueprintErrors,
	type InstanceAiConfirmRequest,
} from '@pong/api-types';
import {
	PongButton,
	PongInput,
	PongOption,
	PongSelect,
	PongTag,
	PongText,
	type IconName,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, ref } from 'vue';

import ToolIcon from '@/features/shared/toolsConnection/ToolIcon.vue';

type AppBlueprintBinding = NonNullable<AppBlueprint['bindings']>[number];

const props = defineProps<{
	blueprint: AppBlueprint;
	readOnly?: boolean;
	/** Field errors from the previous attempt. The card reopens with them. */
	errors?: AppBlueprintErrors;
	/** pong tried to create the app after approval and failed. */
	failed?: boolean;
}>();

const emit = defineEmits<{ submit: [body: InstanceAiConfirmRequest] }>();

const i18n = useI18n();
const name = ref(props.blueprint.name);
const namespace = ref(props.blueprint.namespace);
const visibility = ref(props.blueprint.visibility);
const theme = ref(props.blueprint.theme);
const additionalInstructions = ref(props.blueprint.additionalInstructions ?? '');

const bindingIcons: Record<AppBlueprintBinding['kind'], IconName> = {
	workflow: 'workflow',
	dataTable: 'table',
	agent: 'robot',
};

const visibilityOptions = ['project', 'instance'] as const;
const themeOptions = computed(() =>
	(['light', 'dark', 'both'] as const).map((value) => ({
		value,
		label: i18n.baseText(`instanceAi.appBlueprint.theme.${value}`),
	})),
);
const editedBlueprint = computed<AppBlueprint>(() => ({
	name: name.value.trim(),
	namespace: namespace.value.trim(),
	visibility: visibility.value,
	description: props.blueprint.description,
	theme: theme.value,
	...(props.blueprint.bindings ? { bindings: props.blueprint.bindings } : {}),
	...(additionalInstructions.value.trim()
		? { additionalInstructions: additionalInstructions.value.trim() }
		: {}),
}));
// The error applies to the rejected namespace only. It clears when the user edits it.
// A resolved card shows the approved blueprint, so the error no longer applies.
const namespaceError = computed(() =>
	!props.readOnly &&
	props.errors?.namespace === 'taken' &&
	editedBlueprint.value.namespace === props.blueprint.namespace
		? i18n.baseText('instanceAi.appBlueprint.namespace.taken')
		: undefined,
);
const isValid = computed(
	() =>
		appNameSchema.safeParse(editedBlueprint.value.name).success &&
		appNamespaceSchema.safeParse(editedBlueprint.value.namespace).success &&
		!namespaceError.value &&
		editedBlueprint.value.description.length > 0,
);

function startBuilding() {
	if (props.readOnly || !isValid.value) return;
	emit('submit', {
		kind: 'appBlueprint',
		approved: true,
		blueprint: editedBlueprint.value,
	});
}

function cancel() {
	if (props.readOnly) return;
	emit('submit', {
		kind: 'appBlueprint',
		approved: false,
		blueprint: props.blueprint,
	});
}
</script>

<template>
	<div
		:class="[$style.card, !readOnly && $style.awaitingInput]"
		data-test-id="instance-ai-app-blueprint"
	>
		<div :class="$style.content">
			<PongText size="medium" color="text-dark" bold>
				{{ i18n.baseText('instanceAi.appBlueprint.title') }}
			</PongText>
			<PongText
				size="medium"
				color="text-base"
				:class="$style.description"
				data-test-id="instance-ai-app-blueprint-description"
			>
				{{ blueprint.description }}
			</PongText>

			<div :class="$style.fields">
				<label :class="$style.field">
					<PongText size="medium" color="text-dark">{{
						i18n.baseText('instanceAi.appBlueprint.name')
					}}</PongText>
					<PongInput
						v-model="name"
						size="medium"
						:disabled="readOnly"
						data-test-id="instance-ai-app-blueprint-name"
					/>
				</label>
				<label :class="$style.field">
					<PongText size="medium" color="text-dark">{{
						i18n.baseText('instanceAi.appBlueprint.namespace')
					}}</PongText>
					<PongInput
						v-model="namespace"
						size="medium"
						:disabled="readOnly"
						:class="namespaceError && $style.fieldInvalid"
						:aria-invalid="namespaceError ? 'true' : undefined"
						data-test-id="instance-ai-app-blueprint-namespace"
					/>
					<PongText
						v-if="namespaceError"
						size="small"
						color="danger"
						role="alert"
						data-test-id="instance-ai-app-blueprint-namespace-error"
					>
						{{ namespaceError }}
					</PongText>
				</label>
				<label :class="$style.field">
					<PongText size="medium" color="text-dark">{{
						i18n.baseText('instanceAi.appBlueprint.visibility')
					}}</PongText>
					<PongSelect
						v-model="visibility"
						size="medium"
						:disabled="readOnly"
						data-test-id="instance-ai-app-blueprint-visibility"
					>
						<PongOption
							v-for="option in visibilityOptions"
							:key="option"
							:value="option"
							:label="i18n.baseText(`instanceAi.appBlueprint.visibility.${option}`)"
						/>
					</PongSelect>
				</label>
				<label :class="$style.field">
					<PongText size="medium" color="text-dark">{{
						i18n.baseText('instanceAi.appBlueprint.theme')
					}}</PongText>
					<PongSelect
						v-model="theme"
						size="medium"
						:disabled="readOnly"
						data-test-id="instance-ai-app-blueprint-theme"
					>
						<PongOption
							v-for="option in themeOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</PongSelect>
				</label>
			</div>

			<div v-if="blueprint.bindings?.length" :class="$style.bindings">
				<PongText size="medium" color="text-dark" bold>
					{{ i18n.baseText('instanceAi.appBlueprint.bindings.title') }}
				</PongText>
				<div
					v-for="binding in blueprint.bindings"
					:key="`${binding.status}:${binding.kind}:${binding.name}`"
					:class="$style.binding"
					:data-binding-kind="binding.kind"
					data-test-id="instance-ai-app-blueprint-binding"
				>
					<ToolIcon
						:source="{
							type: 'icon',
							name: bindingIcons[binding.kind],
							color: 'var(--color--text)',
						}"
					/>
					<div :class="$style.bindingLabels">
						<div :class="$style.bindingTitle">
							<PongText size="medium" color="text-dark">{{ binding.name }}</PongText>
							<PongTag
								:text="i18n.baseText(`instanceAi.appBlueprint.bindings.${binding.status}`)"
								:clickable="false"
							/>
						</div>
						<PongText size="small" color="text-light">{{ binding.description }}</PongText>
					</div>
				</div>
			</div>
		</div>

		<div
			v-if="failed"
			:class="$style.failed"
			role="alert"
			data-test-id="instance-ai-app-blueprint-failed"
		>
			<PongText size="medium" color="danger">
				{{ i18n.baseText('instanceAi.appBlueprint.failed') }}
			</PongText>
		</div>

		<div :class="$style.instructions">
			<PongInput
				v-model="additionalInstructions"
				type="textarea"
				size="medium"
				:rows="2"
				:maxlength="2000"
				:disabled="readOnly"
				:placeholder="i18n.baseText('instanceAi.appBlueprint.instructionsPlaceholder')"
				data-test-id="instance-ai-app-blueprint-instructions"
			/>
			<div v-if="!readOnly" :class="$style.actions">
				<PongButton
					variant="outline"
					size="medium"
					data-test-id="instance-ai-app-blueprint-cancel"
					@click="cancel"
				>
					{{ i18n.baseText('generic.cancel') }}
				</PongButton>
				<PongButton
					variant="solid"
					size="medium"
					:disabled="!isValid"
					data-test-id="instance-ai-app-blueprint-start"
					@click="startBuilding"
				>
					{{ i18n.baseText('instanceAi.appBlueprint.approve') }}
				</PongButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/breakpoints';

.card {
	max-width: 90%;
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	overflow: hidden;
}

.awaitingInput {
	border: 0;
	box-shadow: var(--shadow--sm), var(--shadow--outline);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}

.description {
	white-space: pre-wrap;
}

.fields {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
	margin-top: var(--spacing--xs);

	@include breakpoints.breakpoint('xs-only') {
		grid-template-columns: 1fr;
	}
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.bindings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}

.binding {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) 0;
}

.bindingLabels {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.bindingTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.instructions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-top: var(--border);
}

/* The input declares its own border variable, so set it on the input element itself. */
.fieldInvalid:global(.pong-input) {
	--input--border-color: var(--color--danger);
	--input--border-color--hover: var(--color--danger);
	--input--border-color--focus: var(--color--danger);
}

.failed {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
