<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import PongBadge from '../PongBadge';
import type { BadgeSize } from '../PongBadge/Badge.type';

defineOptions({ name: 'PongPreviewBadge' });

withDefaults(
	defineProps<{
		size?: BadgeSize;
		text?: string;
	}>(),
	{ size: 'xxsmall', text: undefined },
);

const { t } = useI18n();
</script>

<template>
	<PongBadge :size="size" :class="$style.badge">
		{{ text ?? t('previewBadge.preview') }}
	</PongBadge>
</template>

<style lang="scss" module>
.badge {
	border-style: dashed;
	border-width: 1.5px;
	--pong-badge--text-color: var(--text-color--subtle);
}
</style>
