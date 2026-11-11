<script setup lang="ts">
import type { InboxPromotionReviewItem, PromotionReviewState } from '@pong/api-types';
import { useToast } from '@pong/composables/useToast';
import {
	PongAvatar,
	PongBadge,
	PongButton,
	PongCallout,
	PongDialog,
	PongDialogDescription,
	PongDialogFooter,
	PongDialogHeader,
	PongDialogTitle,
	PongEmptyState,
	PongExternalLink,
	PongHeading,
	PongTabs,
	PongText,
	type BadgeVariant,
} from '@pong/design-system';
import { componentRegistry, type PromotionChangesState } from '@pong/frontend-module-sdk';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import { computed, ref, useId, watch } from 'vue';

import type { InboxItemChange } from '../inbox.constants';
import { formatUserDisplayName, toError } from '../reviews/workflowReviews.utils';
import { approvePromotionReview } from './promotionReviews.api';

const props = defineProps<{
	item: InboxPromotionReviewItem;
	onItemChange: (change: InboxItemChange) => void;
}>();
const i18n = useI18n();
const { showError } = useToast();
const rootStore = useRootStore();
const disabledReasonId = useId();
const newCommitsId = useId();

const stateBadge: Record<PromotionReviewState, BadgeVariant> = {
	open: 'info',
	changes_requested: 'warning',
	merged: 'success',
	closed: 'subtle',
};

// The editor renders the changes.
const PromotionChanges = computed(() => componentRegistry.get('promotion-changes'));
// One tab for now. The bar matches workflow reviews, which also have an Activity tab.
const tabOptions = computed(() => [
	{ label: i18n.baseText('inbox.promotionReview.detail.tabs.changes'), value: 'changes' as const },
]);

// Approve sends the head of the changes that the reviewer saw. A list refresh can report a newer
// head, which the reviewer did not see.
const changes = ref<PromotionChangesState>({ status: 'loading' });
watch(
	() => props.item.id,
	() => (changes.value = { status: 'loading' }),
);

const hasNewCommits = computed(
	() =>
		changes.value.status === 'ready' &&
		!!props.item.headCommitSha &&
		changes.value.headCommitSha !== props.item.headCommitSha,
);
const withoutEnvironment = computed(() => props.item.remoteError === 'no_connection');
const endedAs = computed(() => (props.item.reviewState === 'merged' ? 'merged' : 'closed'));
// A new key mounts the Changes tab again, so it loads the newest head.
const changesKey = ref(0);

/** What the admin confirms. A later change of the selected row does not change it. */
const pendingApproval = ref<{ id: string; headCommitSha: string } | null>(null);
const approving = ref(false);

const disabledReason = computed(() => {
	const { item } = props;
	if (item.reviewState === 'changes_requested') {
		return i18n.baseText('inbox.promotionReview.approve.disabled.changesRequested');
	}
	if (item.hasConflicts) return i18n.baseText('inbox.promotionReview.approve.disabled.conflicts');
	if (item.remoteError) {
		return i18n.baseText(`inbox.promotionReview.remoteError.${item.remoteError}`);
	}
	if (!item.headCommitSha) {
		return i18n.baseText('inbox.promotionReview.approve.disabled.noHeadCommit');
	}
	if (changes.value.status === 'unavailable') {
		return i18n.baseText('inbox.promotionReview.approve.disabled.changesUnavailable');
	}
	return null;
});
// Loading and new commits show no reason under Approve: loading is short, and the new commits
// callout above the changes explains itself. Screen readers get that callout as the reason.
const approveDisabled = computed(
	() => !!disabledReason.value || hasNewCommits.value || changes.value.status !== 'ready',
);
const approveDescribedBy = computed(() => {
	if (disabledReason.value) return disabledReasonId;
	return hasNewCommits.value ? newCommitsId : undefined;
});

function openApproval() {
	if (changes.value.status !== 'ready') return;
	pendingApproval.value = { id: props.item.id, headCommitSha: changes.value.headCommitSha };
}

// A close cannot stop GitLab, so the dialog stays open until the request ends.
function closeApproval() {
	if (!approving.value) pendingApproval.value = null;
}

async function onApprove() {
	if (!pendingApproval.value || approving.value) return;
	const { id, headCommitSha } = pendingApproval.value;
	// The Inbox can reconcile this result after the viewer selects another item.
	const onItemChange = props.onItemChange;
	approving.value = true;
	try {
		const { state, updatedAt } = await approvePromotionReview(rootStore.restApiContext, id, {
			headCommitSha,
		});
		onItemChange({ type: 'promotion_review', id, state, updatedAt });
	} catch (error: unknown) {
		showError(toError(error), i18n.baseText('inbox.promotionReview.approve.error.title'));
		// Reload the list, so the next attempt uses the current state from GitLab.
		onItemChange({ type: 'promotion_review', id });
	} finally {
		approving.value = false;
		pendingApproval.value = null;
	}
}
</script>

<template>
	<section :class="$style.detail" data-test-id="inbox-promotion-review-detail">
		<header :class="[$style.header, $style.gutter]">
			<div :class="$style.titleRow">
				<!-- Inline, so the state tag follows the last word of a title that wraps. -->
				<div :class="$style.title">
					<PongHeading tag="h2" size="xlarge" bold :class="$style.titleText">
						{{ item.title ?? item.branchName ?? i18n.baseText('inbox.promotionReview.untitled') }}
					</PongHeading>
					<PongBadge
						:variant="stateBadge[item.reviewState]"
						size="xxsmall"
						:class="$style.stateBadge"
					>
						{{ i18n.baseText(`inbox.promotionReview.state.${item.reviewState}`) }}
					</PongBadge>
				</div>
				<PongExternalLink
					v-if="item.webUrl"
					:class="$style.gitlabLink"
					:href="item.webUrl"
					size="small"
				>
					{{ i18n.baseText('inbox.promotionReview.detail.openInGitLab') }}
				</PongExternalLink>
			</div>
			<div :class="$style.meta">
				<span v-if="item.environmentName" :class="$style.metaItem">
					<PongText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionReview.detail.promoteTo') }}
					</PongText>
					<PongText size="small" bold>{{ item.environmentName }}</PongText>
				</span>
				<span v-if="item.approver" :class="$style.metaItem">
					<PongText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionReview.detail.reviewer') }}
					</PongText>
					<PongAvatar
						:first-name="item.approver.firstName"
						:last-name="item.approver.lastName"
						size="xsmall"
					/>
					<PongText size="small">{{ formatUserDisplayName(item.approver) }}</PongText>
				</span>
				<span v-if="item.requester" :class="$style.metaItem">
					<PongText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionReview.detail.requestedBy') }}
					</PongText>
					<PongAvatar
						:first-name="item.requester.firstName"
						:last-name="item.requester.lastName"
						size="xsmall"
					/>
					<PongText size="small">{{ formatUserDisplayName(item.requester) }}</PongText>
				</span>
			</div>
		</header>
		<PongCallout
			v-if="item.remoteError && !withoutEnvironment"
			:class="$style.gutter"
			theme="warning"
			data-test-id="inbox-promotion-review-remote-error"
		>
			{{ i18n.baseText(`inbox.promotionReview.detail.remoteError.${item.remoteError}`) }}
		</PongCallout>
		<div :class="[$style.tabRow, $style.gutter]">
			<PongTabs
				model-value="changes"
				:options="tabOptions"
				variant="modern"
				data-test-id="inbox-promotion-review-tab-bar"
			/>
			<!-- In the tab row, like the Review button of workflow reviews. -->
			<div v-if="item.state === 'open'" :class="$style.approve">
				<!-- Visible text, not a tooltip: a disabled button cannot take keyboard focus. -->
				<PongText
					v-if="disabledReason"
					:id="disabledReasonId"
					size="small"
					color="text-light"
					data-test-id="inbox-promotion-review-approve-reason"
				>
					{{ disabledReason }}
				</PongText>
				<PongButton
					size="small"
					:disabled="approveDisabled"
					:loading="approving"
					:aria-describedby="approveDescribedBy"
					data-test-id="inbox-promotion-review-approve"
					@click="openApproval"
				>
					{{ i18n.baseText('inbox.promotionReview.approve.button') }}
				</PongButton>
			</div>
		</div>
		<div :class="$style.changesArea">
			<PongCallout
				v-if="hasNewCommits"
				theme="warning"
				slim
				:class="[$style.newCommits, $style.gutter]"
				data-test-id="inbox-promotion-review-new-commits"
			>
				<span :id="newCommitsId">{{
					i18n.baseText('inbox.promotionReview.changes.newCommits')
				}}</span>
				<template #trailingContent>
					<PongButton
						variant="outline"
						size="small"
						data-test-id="inbox-promotion-review-reload-changes"
						@click="changesKey++"
					>
						{{ i18n.baseText('inbox.promotionReview.changes.reload') }}
					</PongButton>
				</template>
			</PongCallout>
			<PongEmptyState
				v-if="withoutEnvironment"
				:class="$style.changes"
				:icon="{ type: 'icon', value: endedAs === 'merged' ? 'check' : 'circle-check' }"
				:heading="i18n.baseText(`promotions.review.outcome.${endedAs}.title`)"
				:description="i18n.baseText('inbox.promotionReview.changes.withoutEnvironment')"
				data-test-id="inbox-promotion-review-without-environment"
			/>
			<component
				:is="PromotionChanges"
				v-else
				:key="changesKey"
				:class="$style.changes"
				:review-id="item.id"
				@state="changes = $event"
			/>
		</div>
		<PongDialog
			:open="!!pendingApproval"
			size="small"
			:show-close-button="false"
			:close-on-overlay-click="!approving"
			:close-on-escape="!approving"
			@update:open="closeApproval"
		>
			<PongDialogHeader>
				<PongDialogTitle>
					{{ i18n.baseText('inbox.promotionReview.approve.confirm.title') }}
				</PongDialogTitle>
				<PongDialogDescription>
					{{ i18n.baseText('inbox.promotionReview.approve.confirm.description') }}
				</PongDialogDescription>
			</PongDialogHeader>
			<PongDialogFooter>
				<PongButton
					variant="outline"
					:label="i18n.baseText('generic.cancel')"
					:disabled="approving"
					@click="closeApproval"
				/>
				<PongButton
					:label="i18n.baseText('inbox.promotionReview.approve.button')"
					:loading="approving"
					@click="onApprove"
				/>
			</PongDialogFooter>
		</PongDialog>
	</section>
</template>

<style module lang="scss">
.detail {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--md);
	min-height: 0;
}

.tabRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	/* Holds the active-tab indicator, so the border sits under it. */
	padding-bottom: var(--review-tab-bar--indicator-overhang);
	border-bottom: var(--border);

	> :global(.pong-tabs) {
		transform: translateY(var(--spacing--sm));
	}
}

.changesArea {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
	/* The tab row border already separates the changes from the header. */
	margin-top: calc(-1 * var(--spacing--md));
}

.newCommits {
	/* The same space as the warnings of the changes. */
	margin-top: var(--spacing--sm);
}

.changes {
	flex: 1;
	min-height: 0;
}

/* The right gutter of workflow reviews, so Approve sits where their Review button does. */
.gutter {
	margin-right: var(--spacing--md);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
	/* Matches the title row of workflow reviews, so both headings sit at the same height. */
	min-height: var(--spacing--xl);
}

.title {
	flex: 1;
	min-width: 0;
	/* The font of the heading, so the tag lines up with the title text. */
	font-size: var(--font-size--xl);
	line-height: var(--line-height--sm);
}

.titleText {
	display: inline;
}

.stateBadge {
	margin-left: var(--spacing--xs);
	vertical-align: middle;
}

.approve {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--xs);
}

.gitlabLink {
	/* A standalone external link takes the font size around it. The text next to it is smaller. */
	font-size: var(--font-size--sm);
	white-space: nowrap;
}

.meta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs) var(--spacing--lg);
}

.metaItem {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
