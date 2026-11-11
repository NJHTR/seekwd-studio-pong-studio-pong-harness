<script setup lang="ts">
import type { WorkflowReviewEligibleReviewer } from '@pong/api-types';
import { PongAvatar, PongIcon } from '@pong/design-system';

/**
 * The avatar column of a feed entry that names a person: the actor's avatar, or a person
 * silhouette when the actor was deleted.
 */
defineProps<{
	actor: Pick<WorkflowReviewEligibleReviewer, 'firstName' | 'lastName'> | null;
}>();
</script>

<template>
	<PongAvatar
		v-if="actor"
		size="xxsmall"
		:class="$style.avatar"
		:first-name="actor.firstName"
		:last-name="actor.lastName"
	/>
	<!-- Decorative: the sentence beside it already says "Deleted user". -->
	<div
		v-else
		:class="$style.deletedActor"
		aria-hidden="true"
		data-test-id="workflow-review-activity-deleted-actor"
	>
		<PongIcon icon="circle-user-round" :size="16" color="text-light" />
	</div>
</template>

<style lang="scss" module>
@use '../activity-card' as *;

.avatar {
	@include activity-avatar;
}

/* Sized and centred exactly like the avatar, so the two columns cannot drift apart. */
.deletedActor {
	@include activity-avatar;

	display: flex;
	width: var(--review-activity--avatar-size);
	height: var(--review-activity--avatar-size);
	align-items: center;
	justify-content: center;
}
</style>
