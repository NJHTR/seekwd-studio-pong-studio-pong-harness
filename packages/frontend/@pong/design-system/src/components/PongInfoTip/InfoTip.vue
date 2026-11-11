<script lang="ts" setup>
import { computed } from 'vue';

import type { IconSize } from '../../types';
import type { IconColor } from '../../types/icon';
import PongIcon from '../PongIcon';
import { type IconName } from '../PongIcon/icons';
import PongTooltip from '../PongTooltip';
import type { Placement } from '../PongTooltip/Tooltip.types';

const THEME = ['info', 'info-light', 'warning', 'warning-light', 'danger', 'success'] as const;
const TYPE = ['note', 'tooltip'] as const;

const ICON_MAP: { [name: string]: IconName } = {
	info: 'info',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'info-light': 'info',
	warning: 'triangle-alert',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'warning-light': 'triangle', // NOTE: This requires a custom icon
	danger: 'triangle-alert',
	success: 'circle-check',
} as const;

const COLOR_MAP: Record<keyof IconMap, IconColor> = {
	info: 'text-base',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'info-light': 'text-base',
	warning: 'warning',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'warning-light': 'warning',
	danger: 'danger',
	success: 'success',
};

type IconMap = typeof ICON_MAP;

interface InfoTipProps {
	theme?: (typeof THEME)[number];
	type?: (typeof TYPE)[number];
	bold?: boolean;
	tooltipPlacement?: Placement;
	enterable?: boolean;
	size?: IconSize;
}

defineOptions({ name: 'PongInfoTip' });
const props = withDefaults(defineProps<InfoTipProps>(), {
	theme: 'info',
	type: 'note',
	bold: true,
	tooltipPlacement: 'top',
	enterable: true,
	size: undefined,
});

const iconData = computed<{ icon: IconName; color: IconColor }>(() => {
	return {
		icon: ICON_MAP[props.theme],
		color: COLOR_MAP[props.theme],
	} as const;
});
</script>

<template>
	<div
		:class="{
			'pong-info-tip': true,
			[$style.infoTip]: true,
			[$style[theme]]: true,
			[$style[type]]: true,
			[$style.bold]: bold,
		}"
	>
		<!-- Note that the branching is required to support displaying
		 the slot either in the tooltip of the icon or following it -->
		<PongTooltip
			v-if="type === 'tooltip'"
			:placement="tooltipPlacement"
			:content-class="$style.tooltipContent"
			:disabled="type !== 'tooltip'"
			:enterable
		>
			<span :class="$style.iconText">
				<PongIcon :icon="iconData.icon" :color="iconData.color" :size="size" />
			</span>
			<template #content>
				<span>
					<slot />
				</span>
			</template>
		</PongTooltip>
		<span v-else :class="$style.iconText">
			<PongIcon :icon="iconData.icon" :color="iconData.color" :size="size" />
			<span>
				<slot />
			</span>
		</span>
	</div>
</template>

<style lang="scss" module>
.infoTip {
	display: flex;
}

.base {
	font-size: var(--font-size--2xs);
	line-height: var(--font-size--sm);
	word-break: normal;
	display: flex;
	align-items: center;

	svg {
		font-size: var(--font-size--sm);
	}
}

.bold {
	font-weight: var(--font-weight--medium);
}

.note {
	composes: base;

	svg {
		margin-right: var(--spacing--4xs);
	}
}

.tooltipContent {
	composes: base;
	display: inline-flex;
}

.iconText {
	display: inline-flex;
	align-items: flex-start;
}
</style>
