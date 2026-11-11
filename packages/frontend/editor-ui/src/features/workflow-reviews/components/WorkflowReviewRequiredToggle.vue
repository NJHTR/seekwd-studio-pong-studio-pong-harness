<script setup lang="ts">
import { computed } from 'vue';
import { PongDropdownMenuItem, PongSwitch, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';

const props = defineProps<{
	workflowId: string;
}>();

const i18n = useI18n();
const reviewRequiredStore = useReviewRequiredStore();
const reviewStatusStore = useWorkflowReviewStatusStore();

const hasOpenReview = computed(() => reviewStatusStore.hasOpenReview(props.workflowId));

const reviewRequired = computed({
	get: () => hasOpenReview.value || reviewRequiredStore.isReviewRequired(props.workflowId),
	set: (value: boolean) => {
		if (hasOpenReview.value) return;
		reviewRequiredStore.setReviewRequired(props.workflowId, value);
	},
});
</script>

<template>
	<div :class="$style.footer">
		<PongDropdownMenuItem
			id="review-required"
			:label="i18n.baseText('workflowReviews.reviewRequired.title')"
			:checked="reviewRequired"
			checkbox
			:close-on-select="false"
			:disabled="hasOpenReview"
			divided
			test-id="workflow-review-required-toggle"
			@select="reviewRequired = !reviewRequired"
		>
			<template #item-label="{ ui }">
				<PongText size="small" :class="ui.class">
					{{ i18n.baseText('workflowReviews.reviewRequired.title') }}
				</PongText>
			</template>
			<template #item-trailing="{ ui }">
				<PongSwitch
					:model-value="reviewRequired"
					:disabled="hasOpenReview"
					aria-hidden="true"
					tabindex="-1"
					data-test-id="workflow-review-required-switch"
					:class="[ui.class, $style.switch]"
				/>
			</template>
		</PongDropdownMenuItem>
		<PongText tag="p" size="xsmall" color="text-base" :class="$style.description">
			{{
				hasOpenReview
					? i18n.baseText('workflowReviews.reviewRequired.lockedDescription')
					: i18n.baseText('workflowReviews.reviewRequired.description')
			}}
		</PongText>
	</div>
</template>

<style module>
.footer {
	padding: 0 var(--spacing--4xs) var(--spacing--4xs);
}

.description {
	padding: 0 var(--spacing--2xs) var(--spacing--4xs);
}

.switch {
	pointer-events: none;
}
</style>
