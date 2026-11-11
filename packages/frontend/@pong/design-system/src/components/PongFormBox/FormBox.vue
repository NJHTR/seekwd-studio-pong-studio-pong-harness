<script lang="ts" setup>
import type { FormFieldValue, IFormInput, FormFieldValueUpdate, FormValues } from '../../types';
import { createFormEventBus } from '../../utils';
import PongButton from '../PongButton';
import PongFormInputs from '../PongFormInputs';
import PongHeading from '../PongHeading';
import PongLink from '../PongLink';

interface FormBoxProps {
	title?: string;
	inputs?: IFormInput[];
	buttonText?: string;
	buttonLoading?: boolean;
	secondaryButtonText?: string;
	submitButtonVariant?: 'solid' | 'brand';
	redirectText?: string;
	redirectLink?: string;
}

defineOptions({ name: 'PongFormBox' });
withDefaults(defineProps<FormBoxProps>(), {
	title: '',
	inputs: (): IFormInput[] => [],
	buttonLoading: false,
	redirectText: '',
	redirectLink: '',
	submitButtonVariant: 'solid',
});

const formBus = createFormEventBus();
const emit = defineEmits<{
	submit: [value: FormValues];
	update: [value: FormFieldValueUpdate];
	secondaryClick: [value: Event];
}>();

const onUpdateModelValue = (e: { name: string; value: FormFieldValue }) => emit('update', e);
const onSubmit = (e: { [key: string]: FormFieldValue }) => emit('submit', e);
const onButtonClick = () => formBus.emit('submit');
const onSecondaryButtonClick = (event: Event) => emit('secondaryClick', event);
</script>

<template>
	<div :class="['pong-form-box', $style.container]">
		<div v-if="title" :class="$style.heading">
			<PongHeading size="xlarge">
				{{ title }}
			</PongHeading>
		</div>
		<div :class="$style.inputsContainer">
			<PongFormInputs
				:inputs="inputs"
				:event-bus="formBus"
				:column-view="true"
				@update="onUpdateModelValue"
				@submit="onSubmit"
			/>
		</div>
		<div v-if="secondaryButtonText || buttonText" :class="$style.buttonsContainer">
			<span v-if="secondaryButtonText" :class="$style.secondaryButtonContainer">
				<PongLink size="medium" theme="text" @click="onSecondaryButtonClick">
					{{ secondaryButtonText }}
				</PongLink>
			</span>
			<PongButton
				v-if="buttonText"
				:label="buttonText"
				:loading="buttonLoading"
				data-test-id="form-submit-button"
				size="large"
				:variant="submitButtonVariant"
				@click="onButtonClick"
			/>
		</div>
		<div :class="$style.actionContainer">
			<PongLink v-if="redirectText && redirectLink" :to="redirectLink">
				{{ redirectText }}
			</PongLink>
		</div>
		<slot></slot>
	</div>
</template>

<style lang="scss" module>
.heading {
	display: flex;
	justify-content: center;
	margin-bottom: var(--spacing--xl);
}

.container {
	background-color: var(--color--background--light-3);
	padding: var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: 0 4px 16px rgba(99, 77, 255, 0.06);
}

.inputsContainer {
	margin-bottom: var(--spacing--xl);
}

.actionContainer {
	display: flex;
	justify-content: center;
}

.buttonsContainer {
	composes: actionContainer;
	margin-bottom: var(--spacing--sm);
}

.secondaryButtonContainer {
	flex-grow: 1;
	display: flex;
	align-items: center;
}

.withLabel {
	margin-bottom: var(--spacing--sm);
}
</style>
