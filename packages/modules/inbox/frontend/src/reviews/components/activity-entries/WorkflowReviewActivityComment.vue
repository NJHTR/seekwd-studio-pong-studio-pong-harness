<script setup lang="ts">
import type { WorkflowReviewActivityEntry, WorkflowReviewActivityMessage } from '@pong/api-types';
import { PongText, PongTimeAgo } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import { useRootStore } from '@pong/stores/useRootStore';

import { formatActorName } from '../../workflowReviews.utils';
import WorkflowReviewActivityActorAvatar from './WorkflowReviewActivityActorAvatar.vue';

defineProps<{
	entry: Extract<WorkflowReviewActivityEntry, { type: 'comment.created' }>;
}>();

const i18n = useI18n();
const rootStore = useRootStore();

function authorName(message: WorkflowReviewActivityMessage): string {
	return formatActorName(
		message.createdBy,
		i18n.baseText('workflowReviews.detail.activity.unknownAuthor'),
	);
}
</script>

<template>
	<div :class="$style.entry">
		<div v-for="message in entry.messages" :key="message.id" :class="$style.message">
			<WorkflowReviewActivityActorAvatar :actor="message.createdBy" />
			<div :class="$style.content">
				<div :class="$style.header">
					<PongText
						size="medium"
						color="text-base"
						:class="$style.line"
						data-test-id="workflow-review-activity-comment-author"
					>
						{{ authorName(message) }}
					</PongText>
					<PongText size="medium" color="text-light">
						<time
							:datetime="message.createdAt"
							data-test-id="workflow-review-activity-comment-time"
							:class="$style.timeStamp"
						>
							<PongTimeAgo :date="message.createdAt" :locale="rootStore.defaultLocale" />
						</time>
					</PongText>
				</div>
				<PongText
					v-if="message.deletedAt"
					size="small"
					color="text-light"
					:class="$style.deleted"
					data-test-id="workflow-review-activity-comment-deleted"
				>
					{{ i18n.baseText('workflowReviews.detail.activity.comment.deleted') }}
				</PongText>
				<PongText
					v-else
					size="medium"
					color="text-dark"
					:class="[$style.body, $style.line]"
					data-test-id="workflow-review-activity-comment-body"
				>
					{{ message.body }}
				</PongText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../activity-card' as *;

/* A comment is prose, so it gets the same card as a decision that carries a note. */
.entry {
	@include activity-card;

	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.message {
	@include activity-row;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.header {
	@include activity-headline;
}

.line {
	line-height: var(--review-activity--line-height);
}

.timeStamp {
	padding-left: var(--spacing--4xs);
}

.body {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.deleted {
	font-style: italic;
}
</style>
