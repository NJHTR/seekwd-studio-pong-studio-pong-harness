<script setup lang="ts">
import {
	PongButton,
	PongCheckbox,
	PongDialog,
	PongDialogBody,
	PongDialogDescription,
	PongDialogFooter,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import { useWorkflowReviewDialogPreferences } from '@/features/workflow-reviews/composables/useWorkflowReviewDialogPreferences';

defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	publish: [];
	'submit-for-review': [];
}>();

const i18n = useI18n();
const { publishChoiceDismissed } = useWorkflowReviewDialogPreferences();

const choosePublish = () => {
	emit('update:open', false);
	emit('publish');
};

const chooseReview = () => {
	emit('update:open', false);
	emit('submit-for-review');
};
</script>

<template>
	<PongDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('workflowReviews.publishChoice.title')"
		@update:open="emit('update:open', $event)"
	>
		<PongDialogBody>
			<PongDialogDescription :class="$style.description">
				{{ i18n.baseText('workflowReviews.publishChoice.description') }}
			</PongDialogDescription>
		</PongDialogBody>
		<PongDialogFooter data-test-id="workflow-publish-choice-dialog" :class="$style.footer">
			<PongCheckbox
				v-model="publishChoiceDismissed"
				data-test-id="workflow-publish-choice-dont-show-again"
				:class="$style.dontShowAgain"
			>
				<template #label> {{ i18n.baseText('generic.dontShowAgain') }}</template>
			</PongCheckbox>
			<div :class="$style.actions">
				<PongButton
					variant="outline"
					data-test-id="workflow-submit-for-review-choice-button"
					@click="chooseReview"
				>
					{{ i18n.baseText('workflowReviews.publishChoice.submitForReview') }}
				</PongButton>
				<PongButton data-test-id="workflow-publish-choice-button" @click="choosePublish">
					{{ i18n.baseText('workflowReviews.publishChoice.publish') }}
				</PongButton>
			</div>
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

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}

.dontShowAgain {
	:deep(label) {
		color: var(--text-color--subtler);
	}
}
</style>
