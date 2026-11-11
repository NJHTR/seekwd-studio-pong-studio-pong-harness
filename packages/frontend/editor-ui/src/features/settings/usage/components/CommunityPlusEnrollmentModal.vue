<script lang="ts" setup="">
import { computed, ref } from 'vue';
import type { Validatable, IValidator } from '@pong/design-system';
import { VALID_EMAIL_REGEX } from '@/app/constants';
import { COMMUNITY_PLUS_DOCS_URL } from '../usage.constants';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import { useUsageStore } from '../usage.store';
import { useTelemetry } from '@pong/composables/useTelemetry';
import { useUsersStore } from '@pong/stores/users.store';
import { useUIStore } from '@/app/stores/ui.store';

import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongDialogHeader,
	PongDialogTitle,
	PongFormInput,
	PongText,
} from '@pong/design-system';

defineOptions({ inheritAttrs: false });
const props = defineProps<{
	modalName: string;
	data?: {
		closeCallback?: () => void;
		customHeading?: string;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const usageStore = useUsageStore();
const telemetry = useTelemetry();
const usersStore = useUsersStore();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const isLoading = ref(false);
const valid = ref(false);
const email = ref(usersStore.currentUser?.email ?? '');
const validationRules = ref([{ name: 'email' }]);
const validators = ref<{ [key: string]: IValidator }>({
	email: {
		validate: (value: Validatable) => {
			if (typeof value !== 'string') {
				return false;
			}

			if (!VALID_EMAIL_REGEX.test(value)) {
				return {
					message: 'settings.users.invalidEmailError',
					options: { interpolate: { email: value } },
				};
			}

			return false;
		},
	},
});

function closeDialog() {
	if (uiStore.modalsById[props.modalName]?.open !== true) return;
	telemetry.track('User skipped community plus');
	uiStore.closeModal(props.modalName);
	props.data?.closeCallback?.();
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

const confirm = async () => {
	if (!valid.value || isLoading.value) {
		return;
	}

	isLoading.value = true;
	try {
		const { title, text } = await usageStore.registerCommunityEdition(email.value);
		closeDialog();
		toast.showMessage({
			title: title ?? i18n.baseText('communityPlusModal.success.title'),
			message:
				text ??
				i18n.baseText('communityPlusModal.success.message', {
					interpolate: { email: email.value },
				}),
			type: 'success',
			duration: 0,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('communityPlusModal.error.title'));
	} finally {
		isLoading.value = false;
	}
};
</script>

<template>
	<PongDialog
		:open="modalOpen"
		size="medium"
		:aria-label="data?.customHeading ?? i18n.baseText('communityPlusModal.title')"
		:show-close-button="false"
		:close-on-overlay-click="false"
		:close-on-escape="false"
		@update:open="onDialogOpenUpdate"
	>
		<PongDialogHeader>
			<PongDialogTitle>
				{{ data?.customHeading ?? i18n.baseText('communityPlusModal.title') }}
			</PongDialogTitle>
		</PongDialogHeader>
		<PongDialogBody>
			<div :data-test-id="`${modalName}-modal`">
				<div>
					<PongText tag="p">{{ i18n.baseText('communityPlusModal.description') }}</PongText>
					<ul :class="$style.features">
						<li>
							<i>🐞</i>
							<PongText>
								<strong>{{ i18n.baseText('communityPlusModal.features.debugging.title') }}</strong>
								{{ i18n.baseText('communityPlusModal.features.debugging.description') }}
							</PongText>
						</li>
						<li>
							<i>🔎</i>
							<PongText>
								<strong>{{ i18n.baseText('communityPlusModal.features.execution.title') }}</strong>
								{{ i18n.baseText('communityPlusModal.features.execution.description') }}
							</PongText>
						</li>
						<li>
							<i> 📁</i>
							<PongText>
								<strong>{{ i18n.baseText('communityPlusModal.features.folders.title') }}</strong>
								{{ i18n.baseText('communityPlusModal.features.folders.description') }}
							</PongText>
						</li>
					</ul>
					<PongFormInput
						id="email"
						v-model="email"
						:label="i18n.baseText('communityPlusModal.input.email.label')"
						type="email"
						name="email"
						label-size="small"
						tag-size="small"
						required
						:show-required-asterisk="true"
						:validate-on-blur="false"
						:validation-rules="validationRules"
						:validators="validators"
						@validate="valid = $event"
						@keyup.enter="confirm"
					/>
				</div>
			</div>

			<div :class="$style.notice">
				<PongText size="xsmall" tag="span">
					{{ i18n.baseText('communityPlusModal.notice') }}
					<a :href="COMMUNITY_PLUS_DOCS_URL" target="_blank">
						{{ i18n.baseText('generic.moreInfo') }}
					</a>
				</PongText>
			</div>
		</PongDialogBody>
		<PongDialogFooter :class="$style.footer">
			<PongButton variant="ghost" :disabled="isLoading" @click="closeDialog">{{
				i18n.baseText('communityPlusModal.button.skip')
			}}</PongButton>
			<PongButton :disabled="!valid || isLoading" variant="solid" @click="confirm">
				{{ i18n.baseText('communityPlusModal.button.confirm') }}
			</PongButton>
		</PongDialogFooter>
	</PongDialog>
</template>

<style lang="scss" module>
.notice {
	margin-top: var(--spacing--lg);
}

.footer {
	justify-content: space-between;
}

.features {
	padding: var(--spacing--sm) var(--spacing--lg) 0;
	list-style: none;

	li {
		display: flex;
		padding: 0 var(--spacing--sm) var(--spacing--md) 0;

		i {
			display: inline-block;
			margin: var(--spacing--5xs) var(--spacing--xs) 0 0;
			font-style: normal;
			font-size: var(--font-size--sm);
		}

		strong {
			display: block;
			margin-bottom: var(--spacing--4xs);
		}
	}
}
</style>
