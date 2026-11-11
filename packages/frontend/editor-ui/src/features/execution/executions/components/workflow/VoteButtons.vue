<script setup lang="ts">
import type { AnnotationVote } from 'pong-workflow';

import { PongIconButton } from '@pong/design-system';
defineProps<{
	vote: AnnotationVote | null;
}>();

const emit = defineEmits<{
	'vote-click': [vote: AnnotationVote];
}>();

const onVoteClick = (vote: AnnotationVote) => {
	emit('vote-click', vote);
};
</script>

<template>
	<div :class="$style.ratingIcon">
		<PongIconButton
			variant="ghost"
			:class="[$style.icon, vote === 'up' && $style.up]"
			size="small"
			icon="thumbs-up"
			@click="onVoteClick('up')"
		/>
		<PongIconButton
			variant="ghost"
			:class="[$style.icon, vote === 'down' && $style.down]"
			size="small"
			icon="thumbs-down"
			@click="onVoteClick('down')"
		/>
	</div>
</template>

<style module lang="scss">
.ratingIcon {
	display: flex;
	flex-direction: row;

	.icon {
		color: var(--color--text--tint-1);

		&:not(.up):not(.down):hover {
			color: var(--color--primary);
		}
	}

	.up {
		color: var(--color--success);
	}

	.down {
		color: var(--color--danger);
	}
}
</style>
