<script lang="ts" setup>
import { useI18n } from '../../composables/useI18n';
import PongBadge from '../PongBadge';
import type { BadgeSize } from '../PongBadge/Badge.type';
import PongTooltip from '../PongTooltip';

defineOptions({ name: 'PongEnterpriseReadinessBadge' });

withDefaults(
	defineProps<{
		/** The badge size. Same default as `PongPreviewBadge`. */
		size?: BadgeSize;
	}>(),
	{ size: 'xxsmall' },
);

const { t } = useI18n();
</script>

<template>
	<PongTooltip :content="t('enterpriseReadinessBadge.tooltip')" placement="top" as-child>
		<PongBadge variant="outline" :size="size" :class="$style.badge" tabindex="0">
			{{ t('enterpriseReadinessBadge.limited') }}
		</PongBadge>
	</PongTooltip>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.badge {
	cursor: default;
	outline: none;

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}
</style>
