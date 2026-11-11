<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useI18n } from '@pong/i18n';
import { PongButton, PongIcon } from '@pong/design-system';

import { VIEWS } from '@/app/constants';

const i18n = useI18n();
const router = useRouter();

async function goBack() {
	await router.push({ name: VIEWS.AUTHENTICATION_SETTINGS });
}
</script>

<template>
	<!-- The SSO and LDAP pages predate PongSettingsLayout; this mirrors its back action. -->
	<div :class="$style.backRow">
		<PongButton
			variant="ghost"
			size="small"
			:class="$style.backButton"
			data-test-id="settings-authentication-back"
			@click="goBack"
		>
			<template #icon>
				<PongIcon icon="arrow-left" />
			</template>
			{{ i18n.baseText('settings.authentication.back') }}
		</PongButton>
	</div>
</template>

<style lang="scss" module>
.backRow {
	display: flex;
	margin-bottom: var(--spacing--lg);
}

.backButton {
	/* Pull the ghost button's inner padding so the arrow aligns with the page heading. */
	margin-inline-start: calc(-1 * var(--spacing--xs));
}
</style>
