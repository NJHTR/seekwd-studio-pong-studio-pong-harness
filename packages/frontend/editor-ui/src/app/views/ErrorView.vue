<script setup lang="ts">
import type { BaseTextKey } from '@pong/i18n';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useI18n } from '@pong/i18n';
import { PongButton, PongHeading, PongIcon, PongText } from '@pong/design-system';
const router = useRouter();

const props = defineProps<{
	messageKey: BaseTextKey;
	errorCode: number;
	redirectTextKey: BaseTextKey;
	redirectPage?: keyof typeof VIEWS;
}>();

const i18n = useI18n();

function onButtonClick() {
	void router.push({ name: props.redirectPage ?? VIEWS.HOMEPAGE });
}
</script>

<template>
	<div :class="$style.container">
		<PongIcon icon="triangle-alert" :class="$style.icon" />
		<div :class="$style.message">
			<div>
				<PongHeading size="2xlarge">
					{{ i18n.baseText(messageKey) }}
				</PongHeading>
			</div>
			<div>
				<PongText v-if="errorCode" size="large">
					{{ errorCode }} {{ i18n.baseText('error') }}
				</PongText>
			</div>
		</div>
		<PongButton :label="i18n.baseText(redirectTextKey)" @click="onButtonClick" />
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
}

.icon {
	min-height: 96px;
	min-width: 108px;
	margin-bottom: var(--spacing--2xl);
	color: var(--color--foreground);
}

.message {
	margin-bottom: var(--spacing--lg);

	* {
		margin-bottom: var(--spacing--2xs);
		display: flex;
		justify-content: center;
	}
}
</style>
