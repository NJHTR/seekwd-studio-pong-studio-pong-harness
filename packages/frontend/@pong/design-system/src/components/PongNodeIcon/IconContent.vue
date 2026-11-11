<script lang="ts" setup>
import { computed } from 'vue';

import PongNodeIcon from './NodeIcon.vue';
import PongIcon from '../PongIcon';
import { isSupportedIconName, type IconName, type NodeIconName } from '../PongIcon/icons';
import PongTooltip from '../PongTooltip';

type IconType = 'file' | 'icon' | 'unknown';

interface IconContentProps {
	type: IconType;
	src?: string;
	name?: string;
	nodeTypeName?: string;
	size?: number;
	badge?: { src?: string; name?: string; type: IconType; tooltip?: string };
}

const props = defineProps<IconContentProps>();

const badgeSize = computed((): number => {
	switch (props.size) {
		case 40:
			return 18;
		case 24:
			return 10;
		case 18:
		default:
			return 12;
	}
});

const fontStyleData = computed((): Record<string, string> => {
	if (!props.size) {
		return {};
	}

	return {
		'max-width': `${props.size}px`,
	};
});

const badgeStyleData = computed((): Record<string, string> => {
	const size = badgeSize.value;
	return {
		padding: `${Math.floor(size / 4)}px`,
		right: `-${Math.floor(size / 2)}px`,
		bottom: `-${Math.floor(size / 2)}px`,
	};
});

const supportedIconName = computed((): IconName | NodeIconName | undefined => {
	return isSupportedIconName(props.name) ? props.name : undefined;
});
</script>

<template>
	<div v-if="type !== 'unknown'" :class="$style.icon">
		<img
			v-if="type === 'file'"
			:src="src"
			referrerpolicy="no-referrer"
			:class="$style.nodeIconImage"
		/>
		<PongIcon v-else-if="supportedIconName" :icon="supportedIconName" :style="fontStyleData" />
		<div v-else :class="$style.nodeIconPlaceholder">
			{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
		</div>

		<!-- Badge icon, for example used for HTTP based nodes -->
		<div v-if="badge" :class="$style.badge" :style="badgeStyleData">
			<!-- Only render the (memory-heavy) tooltip when the badge actually has one -->
			<PongTooltip v-if="badge.tooltip" placement="top">
				<template #content>{{ badge.tooltip }}</template>
				<PongNodeIcon :type="badge.type" :src="badge.src" :name="badge.name" :size="badgeSize" />
			</PongTooltip>
			<PongNodeIcon
				v-else
				:type="badge.type"
				:src="badge.src"
				:name="badge.name"
				:size="badgeSize"
			/>
		</div>
	</div>
	<div v-else :class="$style.nodeIconPlaceholder">
		{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
	</div>
</template>

<style lang="scss" module>
.icon {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;

	svg {
		max-width: 100%;
		max-height: 100%;
	}

	img,
	svg {
		pointer-events: none;
	}
}

.nodeIconPlaceholder {
	text-align: center;
}

// Fill the slot so icons declared smaller than it scale up, not only down.
.nodeIconImage {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.badge {
	position: absolute;
	background: var(--node--icon--badge--color--background, var(--color--background));
	border-radius: 50%;
	// Drive the nested icon's color (its wrapper reads `--node--icon--color`) so an
	// icon badge stays readable against the badge background in both themes.
	// File/image badges are unaffected.
	--node--icon--color: var(--color--text--shade-1);
}
</style>
