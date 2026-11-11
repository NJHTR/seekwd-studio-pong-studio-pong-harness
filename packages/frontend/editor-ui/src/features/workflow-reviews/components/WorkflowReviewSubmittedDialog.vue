<script setup lang="ts">
import {
	PongButton,
	PongCheckbox,
	PongDialog,
	PongDialogBody,
	PongDialogDescription,
	PongDialogFooter,
	PongLink,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { I18nT } from 'vue-i18n';

import { useWorkflowReviewDialogPreferences } from '@/features/workflow-reviews/composables/useWorkflowReviewDialogPreferences';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';

defineProps<{
	open: boolean;
	workflowReviewRequestId: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const { submittedDialogDismissed } = useWorkflowReviewDialogPreferences();
</script>

<template>
	<PongDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('workflowReviews.submitted.title')"
		@update:open="emit('update:open', $event)"
	>
		<PongDialogBody>
			<PongDialogDescription
				data-test-id="workflow-review-submitted-dialog"
				:class="$style.description"
			>
				<I18nT keypath="workflowReviews.submitted.description" tag="span" scope="global">
					<template #submission>
						<PongLink
							:to="{
								name: WORKFLOW_REVIEW_REQUESTS_VIEW,
								params: { reviewId: workflowReviewRequestId },
							}"
						>
							{{ i18n.baseText('workflowReviews.submitted.description.submission') }}
						</PongLink>
					</template>
				</I18nT>
			</PongDialogDescription>
		</PongDialogBody>
		<PongDialogFooter :class="$style.footer">
			<PongCheckbox
				v-model="submittedDialogDismissed"
				data-test-id="workflow-review-submitted-dont-show-again"
				:class="$style.dontShowAgain"
			>
				<template #label> {{ i18n.baseText('generic.dontShowAgain') }}</template>
			</PongCheckbox>
			<PongButton
				data-test-id="workflow-review-submitted-got-it-button"
				@click="emit('update:open', false)"
			>
				{{ i18n.baseText('workflowReviews.submitted.gotIt') }}
			</PongButton>
		</PongDialogFooter>
	</PongDialog>
</template>

<style lang="scss" module>
.description {
	display: block;
	margin-top: var(--spacing--xs);
}

.footer {
	align-items: center;
	justify-content: space-between;
}

.dontShowAgain {
	:deep(label) {
		color: var(--text-color--subtler);
	}
}
</style>
