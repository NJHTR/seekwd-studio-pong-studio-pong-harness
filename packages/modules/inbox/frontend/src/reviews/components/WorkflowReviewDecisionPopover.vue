<script setup lang="ts">
import { WORKFLOW_REVIEW_TEXT_MAX_LENGTH } from '@pong/api-types';
import { useToast } from '@pong/composables/useToast';
import { PongButton, PongIcon, PongInput, PongPopover, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { storeToRefs } from 'pinia';
import { computed, ref, useId } from 'vue';

import { useReviewActivityStore } from '../reviewActivity.store';
import type { WorkflowReviewDecisionInput } from '../workflowReviews.api';

const props = defineProps<{
	deciding: boolean;
	viewerCanDecide: boolean;
	viewerCanComment: boolean;
	/** Why the viewer may not decide; empty when they may. */
	ineligibilityHint: string;
}>();

const emit = defineEmits<{
	decide: [input: WorkflowReviewDecisionInput];
	'comment-posted': [];
}>();

const i18n = useI18n();
const { showError } = useToast();
const store = useReviewActivityStore();
const { posting, decisionNote } = storeToRefs(store);

const isOpen = ref(false);
const noteInputId = useId();

const note = computed(() => decisionNote.value.trim());

// Every viewer who may decide may also comment, and a viewer who may not decide cannot open
// the popover at all, so the last term only guards against those two rules drifting apart.
const commentDisabled = computed(
	() => posting.value || props.deciding || note.value.length === 0 || !props.viewerCanComment,
);

// A comment in flight leaves its text in the box on purpose, so without this the same text
// goes out twice: once as the comment, once as the decision note.
const decisionDisabled = computed(() => props.deciding || posting.value);

function submitDecision(input: WorkflowReviewDecisionInput) {
	isOpen.value = false;
	emit('decide', input);
}

function onRequestChanges() {
	submitDecision({ decision: 'changes_requested', note: note.value });
}

function onApprove() {
	// The key is omitted rather than sent empty: the DTO rejects `''`.
	submitDecision(
		note.value ? { decision: 'approved', note: note.value } : { decision: 'approved' },
	);
}

async function onComment() {
	const body = note.value;

	isOpen.value = false;
	try {
		// A comment that landed after the viewer moved on says nothing about the review they
		// are reading now, so neither its note nor its tab may be touched.
		if (!(await store.postComment(body))) return;

		store.clearDecisionNote(body);
		// The trigger sits outside the tab panel, so a comment posted from the Changes tab
		// would otherwise land nowhere the viewer can see.
		emit('comment-posted');
	} catch (error) {
		showError(error, i18n.baseText('workflowReviews.detail.activity.error.post'));
	}
}
</script>

<template>
	<!-- 480px deviates from Figma's 440px on purpose: the three icon+label buttons do not fit
		in 440px, and PongPopover sets a fixed width, so the row would spill rather than wrap. -->
	<PongPopover
		v-model:open="isOpen"
		side="bottom"
		align="end"
		width="480px"
		:enable-scrolling="false"
		:content-class="$style.popover"
	>
		<template #trigger>
			<!-- Wrapped only while the viewer may not decide: PongTooltip does not forward attrs
				on this branch, so the trigger props land on the span — which is what makes the
				hint fire over a natively disabled button, and this trigger cannot open anything
				anyway. An enabled trigger has to stay the bare button, or it loses `aria-expanded`
				and the focus it gets back on close. -->
			<span v-if="ineligibilityHint">
				<PongTooltip :content="ineligibilityHint" :show-after="300">
					<PongButton
						size="small"
						:disabled="deciding || !viewerCanDecide"
						data-test-id="workflow-review-decision-trigger"
					>
						{{ i18n.baseText('workflowReviews.detail.decision.trigger') }}
						<PongIcon icon="chevron-down" />
					</PongButton>
				</PongTooltip>
			</span>
			<PongButton
				v-else
				size="small"
				:disabled="deciding || !viewerCanDecide"
				data-test-id="workflow-review-decision-trigger"
			>
				{{ i18n.baseText('workflowReviews.detail.decision.trigger') }}
				<PongIcon icon="chevron-down" />
			</PongButton>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="workflow-review-decision-popover">
				<PongInput
					:id="noteInputId"
					v-model="decisionNote"
					:aria-label="i18n.baseText('workflowReviews.detail.decision.note.label')"
					type="textarea"
					:rows="3"
					:maxlength="WORKFLOW_REVIEW_TEXT_MAX_LENGTH"
					:placeholder="i18n.baseText('workflowReviews.detail.activity.composer.placeholder')"
					:class="$style.input"
					data-test-id="workflow-review-decision-note"
				/>
				<div :class="$style.actions">
					<PongButton
						variant="outline"
						size="small"
						:disabled="commentDisabled"
						data-test-id="workflow-review-decision-comment-button"
						@click="onComment"
					>
						<template #icon>
							<PongIcon icon="message-square" />
						</template>
						{{ i18n.baseText('workflowReviews.detail.decision.comment') }}
					</PongButton>
					<PongTooltip
						:disabled="!!note"
						:content="i18n.baseText('workflowReviews.detail.decision.note.required')"
						:show-after="300"
					>
						<PongButton
							variant="outline"
							size="small"
							:disabled="!note || decisionDisabled"
							data-test-id="workflow-review-decision-request-changes-button"
							@click="onRequestChanges"
						>
							<template #icon>
								<PongIcon icon="refresh-cw" />
							</template>
							{{ i18n.baseText('workflowReviews.detail.decision.requestChanges') }}
						</PongButton>
					</PongTooltip>
					<PongButton
						variant="outline"
						size="small"
						:disabled="decisionDisabled"
						data-test-id="workflow-review-decision-approve-button"
						@click="onApprove"
					>
						<template #icon>
							<PongIcon icon="check" />
						</template>
						{{ i18n.baseText('workflowReviews.detail.decision.approveAndPublish') }}
					</PongButton>
				</div>
			</div>
		</template>
	</PongPopover>
</template>

<style lang="scss" module>
.popover {
	padding: var(--spacing--xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.input {
	:global(textarea) {
		max-height: 50dvh;
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
