<script setup lang="ts">
import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@pong/api-types';
import { PongAvatar, PongCard, PongIcon, PongLink, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

import { VIEWS } from '@pong/frontend-constants/views';
import { formatUserDisplayName } from '../workflowReviews.utils';
import { getWorkflowReviewStatusDisplay } from '../workflowReviewStatus.utils';
import WorkflowReviewStatusDot from './WorkflowReviewStatusDot.vue';

const props = defineProps<{
	review: WorkflowReviewInboxItem | WorkflowReviewRequestDetail;
}>();

const i18n = useI18n();

const detail = computed<WorkflowReviewRequestDetail | null>(() =>
	'workflows' in props.review ? props.review : null,
);

// Authors include the requester, who already has their own section above.
const otherAuthors = computed(() =>
	props.review.authors.filter((author) => author.id !== props.review.requester?.id),
);

const statusSummary = computed(() =>
	getWorkflowReviewStatusDisplay(i18n, props.review.state, props.review.decision),
);
</script>

<template>
	<aside :class="$style.metadata" data-test-id="workflow-review-detail-metadata">
		<PongCard :class="$style.card" data-test-id="workflow-review-detail-status-card">
			<template #header>
				<PongText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.status') }}
				</PongText>
			</template>
			<div :class="$style.status">
				<WorkflowReviewStatusDot :state="review.state" :decision="review.decision" decorative />
				<PongText size="medium">
					{{ statusSummary.stateLabel }}
					<span aria-hidden="true" :class="$style.statusSeparator">|</span>
					{{ statusSummary.decisionLabel }}
				</PongText>
			</div>
		</PongCard>

		<PongCard
			:class="[$style.card, $style.peopleCard]"
			data-test-id="workflow-review-detail-people-card"
		>
			<div :class="$style.section">
				<PongText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.requestedBy') }}
				</PongText>
				<div v-if="review.requester" :class="$style.person">
					<PongAvatar
						:first-name="review.requester.firstName"
						:last-name="review.requester.lastName"
						size="xsmall"
					/>
					<PongText size="medium">{{ formatUserDisplayName(review.requester) }}</PongText>
				</div>
				<PongText
					v-else
					color="text-light"
					size="medium"
					data-test-id="workflow-review-detail-requester-deleted"
				>
					{{ i18n.baseText('workflowReviews.detail.metadata.requesterDeleted') }}
				</PongText>
			</div>

			<div
				v-if="otherAuthors.length > 0"
				:class="$style.section"
				data-test-id="workflow-review-detail-other-authors"
			>
				<PongText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.otherAuthors') }}
				</PongText>
				<div v-for="author in otherAuthors" :key="author.id" :class="$style.person">
					<PongAvatar :first-name="author.firstName" :last-name="author.lastName" size="xsmall" />
					<PongText size="medium">{{ formatUserDisplayName(author) }}</PongText>
				</div>
			</div>

			<div :class="$style.section">
				<PongText bold color="text-light" size="medium">
					{{ i18n.baseText('workflowReviews.detail.metadata.reviewers') }}
				</PongText>
				<div v-for="reviewer in review.reviewers" :key="reviewer.id" :class="$style.person">
					<PongAvatar
						:first-name="reviewer.firstName"
						:last-name="reviewer.lastName"
						size="xsmall"
					/>
					<PongText size="medium">{{ formatUserDisplayName(reviewer) }}</PongText>
				</div>
				<PongText
					v-if="review.reviewers.length === 0"
					color="text-light"
					size="medium"
					data-test-id="workflow-review-detail-no-reviewers"
				>
					{{ i18n.baseText('workflowReviews.detail.metadata.noReviewers') }}
				</PongText>
			</div>
		</PongCard>

		<PongCard
			v-if="detail?.workflows.length"
			:class="$style.card"
			data-test-id="workflow-review-detail-changes-card"
		>
			<template #header>
				<PongText bold color="text-light" size="medium">
					{{
						i18n.baseText('workflowReviews.detail.metadata.workflow', {
							adjustToNumber: detail.workflows.length,
						})
					}}
				</PongText>
			</template>
			<div :class="$style.workflows">
				<PongLink
					v-for="workflow in detail.workflows"
					:key="workflow.workflowId"
					:to="{ name: VIEWS.WORKFLOW, params: { workflowId: workflow.workflowId } }"
					theme="text"
					size="medium"
					:class="$style.workflow"
					data-test-id="workflow-review-detail-workflow-link"
				>
					<PongIcon icon="workflow" size="medium" :class="$style.workflowIcon" />
					<span :class="$style.workflowName">{{ workflow.workflowName }}</span>
				</PongLink>
			</div>
		</PongCard>
	</aside>
</template>

<style module lang="scss">
.metadata {
	position: sticky;
	top: 0;
	align-self: flex-start;
	display: flex;
	flex: 0 0 min(18rem, 30%);
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 14rem;
	padding-top: var(--spacing--5xs);
}

.card {
	--card--padding: var(--spacing--xs);
	--pong--card-body--gap: var(--spacing--2xs);

	align-items: stretch;
	border-color: var(--border-color);
	background-color: transparent;

	> div {
		gap: var(--spacing--4xs);
	}
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.section,
.workflows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.statusSeparator {
	margin-inline: var(--spacing--3xs);
	color: var(--text-color--subtler);
}

.peopleCard {
	--pong--card-body--gap: var(--spacing--sm);
}

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	/* Names wrap at spaces; an email breaks mid-word only when it does not fit. */
	overflow-wrap: anywhere;
}

.workflow {
	display: flex;
	width: 100%;
	min-width: 0;

	> span,
	> span > span {
		display: flex;
		flex: 1;
		align-items: flex-start;
		min-width: 0;
	}
}

.workflowName {
	flex: 1;
	min-width: 0;
	/* A name with no spaces still has to break somewhere. */
	overflow-wrap: anywhere;
}

.workflowIcon {
	flex-shrink: 0;
	margin-right: var(--spacing--4xs);
	/* Optically centre the icon on the first line of text. */
	margin-top: calc((1lh - 1em) / 2);
}

@media (max-width: 75rem) {
	.metadata {
		flex-basis: 15rem;
		min-width: 12rem;
	}
}

@container review-detail (max-width: 44rem) {
	.metadata {
		flex-basis: auto;
		width: 100%;
		min-width: 0;
	}
}
</style>
