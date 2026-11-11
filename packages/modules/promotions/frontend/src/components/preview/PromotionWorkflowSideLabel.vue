<script setup lang="ts">
import { PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import type { DetailSide } from '../../promotionPreview.content';

// Before is the current state of the destination in both directions. The page names the
// branch and the instance, so the canvas labels stay neutral.
defineProps<{ side: DetailSide }>();
const i18n = useI18n();
</script>

<template>
	<PongText color="text-dark" size="small" compact :class="$style.badge">
		{{ i18n.baseText(`workflowDiff.label.${side}`) }}
	</PongText>
</template>

<style module lang="scss">
.badge {
	// The source badge of the editor's workflow diff. The module cannot import the editor styles.
	position: absolute;
	top: var(--spacing--xs);
	left: var(--spacing--xs);
	z-index: 1;
	border-radius: var(--radius--3xs);
	border: var(--border-width) solid var(--color--foreground--tint-1);
	background: var(--color--foreground--tint-2);
	display: flex;
	height: 30px;
	padding: 0 var(--spacing--xs);
	align-items: center;
	gap: var(--spacing--2xs);
	align-self: stretch;
}
</style>
