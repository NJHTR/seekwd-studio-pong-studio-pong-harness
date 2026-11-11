<script setup lang="ts">
import { PongLogo } from '@pong/design-system';
import type { FormFieldValueUpdate, IFormBoxConfig } from '@/Interface';
import { useSettingsStore } from '@pong/stores/settings.store';
import type { EmailOrLdapLoginIdAndPassword } from './SigninView.vue';

import { PongFormBox, PongText } from '@pong/design-system';
withDefaults(
	defineProps<{
		/** The standard form box. Omit it when the default slot renders the card instead. */
		form?: IFormBoxConfig;
		formLoading?: boolean;
		subtitle?: string;
	}>(),
	{
		form: undefined,
		formLoading: false,
		subtitle: undefined,
	},
);

const emit = defineEmits<{
	update: [FormFieldValueUpdate];
	submit: [values: EmailOrLdapLoginIdAndPassword];
	secondaryClick: [];
}>();

const onUpdate = (e: FormFieldValueUpdate) => {
	emit('update', e);
};

const onSubmit = (data: unknown) => {
	emit('submit', data as EmailOrLdapLoginIdAndPassword);
};

const onSecondaryClick = () => {
	emit('secondaryClick');
};

const {
	settings: { releaseChannel },
} = useSettingsStore();
</script>

<template>
	<div :class="$style.container">
		<PongLogo size="large" :release-channel="releaseChannel" />
		<div v-if="subtitle" :class="$style.textContainer">
			<PongText size="large">{{ subtitle }}</PongText>
		</div>
		<div :class="$style.formContainer">
			<slot>
				<PongFormBox
					v-if="form"
					v-bind="form"
					data-test-id="auth-form"
					:button-loading="formLoading"
					submit-button-variant="brand"
					@secondary-click="onSecondaryClick"
					@submit="onSubmit"
					@update="onUpdate"
				/>
			</slot>
		</div>
	</div>
</template>

<style lang="scss" module>
body {
	background-color: var(--color--background--light-2);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing--2xl);

	> * {
		width: 352px;
	}
}

.textContainer {
	text-align: center;
}

.formContainer {
	padding-bottom: var(--spacing--xl);
}
</style>
