<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { PongButton, PongHeading, PongLogo, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useUsersStore } from '@pong/stores/users.store';

import { VIEWS } from '@/app/constants';

const usersStore = useUsersStore();
const {
	settings: { releaseChannel },
} = useSettingsStore();

const locale = useI18n();
const toast = useToast();
const router = useRouter();

const loading = ref(false);
const ready = ref(false);
const newEmail = ref('');

const getToken = () => {
	const { token } = router.currentRoute.value.query;
	return typeof token === 'string' && token.length > 0 ? token : null;
};

const onConfirm = async () => {
	const token = getToken();
	if (!token) return;

	try {
		loading.value = true;
		await usersStore.confirmEmailChange({ token });

		toast.showMessage({
			type: 'success',
			title: locale.baseText('auth.confirmEmailChange.success.title'),
			message: locale.baseText('auth.confirmEmailChange.success.message'),
		});

		// ponytail: end the session so the /signin guest guard renders sign-in.
		// A failed /logout call lands in the catch below with a generic error toast;
		// scope the catch if that mislabel is ever hit in practice.
		await usersStore.logout();
		await router.push({ name: VIEWS.SIGNIN });
	} catch (error) {
		toast.showError(error, locale.baseText('auth.confirmEmailChange.error'));
	}
	loading.value = false;
};

onMounted(async () => {
	const token = getToken();
	if (!token) {
		toast.showError(
			new Error(locale.baseText('auth.confirmEmailChange.missingTokenError')),
			locale.baseText('auth.confirmEmailChange.error'),
		);
		void router.replace({ name: VIEWS.SIGNIN });
		return;
	}

	try {
		// The mutating step runs on confirm, so an email-scanner GET of this link
		// only resolves the token here and never applies the change.
		const resolved = await usersStore.resolveEmailChangeToken({ token });
		newEmail.value = resolved.email;
		ready.value = true;
	} catch (error) {
		toast.showError(error, locale.baseText('auth.confirmEmailChange.tokenValidationError'));
		void router.replace({ name: VIEWS.SIGNIN });
	}
});
</script>

<template>
	<div :class="$style.container">
		<PongLogo size="large" :release-channel="releaseChannel" />
		<div v-if="ready" :class="$style.card" data-test-id="confirm-email-change">
			<PongHeading size="xlarge">{{ locale.baseText('auth.confirmEmailChange.title') }}</PongHeading>
			<PongText color="text-base">
				{{ locale.baseText('auth.confirmEmailChange.message', { interpolate: { newEmail } }) }}
			</PongText>
			<PongButton
				:label="locale.baseText('auth.confirmEmailChange.button')"
				:loading="loading"
				size="large"
				data-test-id="confirm-email-change-button"
				@click="onConfirm"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: var(--spacing--2xl);
}

.card {
	margin-top: var(--spacing--xl);
	width: 352px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--xl);
	text-align: center;
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: 0 4px 16px rgba(99, 77, 255, 0.06);
}
</style>
