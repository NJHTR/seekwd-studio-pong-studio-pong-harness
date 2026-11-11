<script setup lang="ts">
import type { PromotePackageResultDto, PromotionProviderType } from '@pong/api-types';
import { useToast } from '@pong/composables/useToast';
import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongDialogHeader,
	PongDialogTitle,
	PongLink,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import { computed, nextTick, ref, useTemplateRef } from 'vue';

import { httpUrl, warningSegments } from '../promotionResult';
import { promotePackage } from '../promotionsSettings.api';
import PromotionCommitMessageField from './PromotionCommitMessageField.vue';

const props = defineProps<{
	open: boolean;
	environmentId: string;
	environmentName: string;
	baseBranchName: string;
	createBranchOnPromotion: boolean;
	providerType: PromotionProviderType;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const commitMessage = ref('');
const isSubmitting = ref(false);
const result = ref<PromotePackageResultDto | null>(null);
const messageField = useTemplateRef('messageField');

const dialogTitle = computed(() =>
	i18n.baseText(
		result.value
			? 'settings.promotions.promote.dialog.result.title'
			: 'settings.promotions.promote.dialog.title',
		{ interpolate: { environment: props.environmentName } },
	),
);

const ariaDescription = computed(() =>
	result.value
		? dialogTitle.value
		: i18n.baseText('settings.promotions.promote.dialog.ariaDescription'),
);

const bodyText = computed(() => {
	if (props.providerType === 'gitlab' && props.createBranchOnPromotion) {
		return i18n.baseText('settings.promotions.promote.dialog.body.mergeRequest', {
			interpolate: { branch: props.baseBranchName },
		});
	}
	return props.createBranchOnPromotion
		? i18n.baseText('settings.promotions.promote.dialog.body.newBranch')
		: i18n.baseText('settings.promotions.promote.dialog.body.toBranch', {
				interpolate: { branch: props.baseBranchName },
			});
});

const mergeRequestUrl = computed(() => httpUrl(result.value?.review?.webUrl));

const reviewNotRecorded = computed(() => i18n.baseText('promotions.result.reviewNotRecorded'));

const pushedText = computed(() =>
	result.value
		? i18n.baseText('promotions.result.pushed', {
				interpolate: { branch: result.value.git.branchName },
			})
		: '',
);

function close() {
	emit('update:open', false);
}

function onOpenChange(value: boolean) {
	if (value || isSubmitting.value) return;
	close();
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	void nextTick(() => messageField.value?.focus());
}

async function submit() {
	if (isSubmitting.value) return;

	const message = commitMessage.value.trim();
	isSubmitting.value = true;
	try {
		result.value = await promotePackage(
			rootStore.publicApiContext,
			props.environmentId,
			message ? { commitMessage: message } : {},
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.promote.toast.error'));
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<template>
	<PongDialog
		:open="open"
		size="medium"
		:aria-description="ariaDescription"
		data-test-id="promote-instance-dialog"
		@open-auto-focus="onOpenAutoFocus"
		@update:open="onOpenChange"
	>
		<PongDialogHeader>
			<PongDialogTitle>
				{{ dialogTitle }}
			</PongDialogTitle>
		</PongDialogHeader>

		<template v-if="!result">
			<PongDialogBody>
				<form id="promote-instance-form" :class="$style.body" @submit.prevent="submit">
					<PongText color="text-base">{{ bodyText }}</PongText>

					<PromotionCommitMessageField
						ref="messageField"
						v-model="commitMessage"
						:disabled="isSubmitting"
					/>
				</form>
			</PongDialogBody>
			<PongDialogFooter>
				<PongButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="promote-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</PongButton>
				<PongButton
					type="submit"
					form="promote-instance-form"
					:disabled="isSubmitting"
					:loading="isSubmitting"
					data-test-id="promote-confirm-button"
				>
					{{ i18n.baseText('settings.promotions.promote.dialog.confirm') }}
				</PongButton>
			</PongDialogFooter>
		</template>

		<template v-else>
			<PongDialogBody>
				<div :class="$style.body">
					<PongLink
						v-if="mergeRequestUrl"
						:to="mergeRequestUrl"
						new-window
						data-test-id="promote-merge-request-link"
					>
						{{ i18n.baseText('promotions.result.viewMergeRequest') }}
					</PongLink>
					<PongText v-else color="text-base" data-test-id="promote-result-summary">
						{{ pushedText }}
					</PongText>
					<PongText
						v-for="(warning, index) in result.warnings"
						:key="index"
						color="text-base"
						data-test-id="promote-warning"
					>
						<template
							v-for="(segment, segmentIndex) in warningSegments(warning, reviewNotRecorded)"
							:key="segmentIndex"
						>
							<PongLink v-if="segment.kind === 'link'" :to="segment.url" new-window>
								{{ segment.url }}
							</PongLink>
							<template v-else>{{ segment.text }}</template>
						</template>
					</PongText>
				</div>
			</PongDialogBody>
			<PongDialogFooter>
				<PongButton type="button" data-test-id="promote-close-button" @click="close">
					{{ i18n.baseText('generic.close') }}
				</PongButton>
			</PongDialogFooter>
		</template>
	</PongDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
</style>
