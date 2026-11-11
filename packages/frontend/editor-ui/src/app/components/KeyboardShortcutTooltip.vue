<script setup lang="ts">
import type { KeyboardShortcut } from '@/Interface';
import type { PongTooltipProps } from '@pong/design-system';

import { PongKeyboardShortcut, PongTooltip } from '@pong/design-system';
interface Props {
	label: string;
	shortcut?: KeyboardShortcut;
	placement?: PongTooltipProps['placement'];
	disabled?: boolean;
}
withDefaults(defineProps<Props>(), { placement: 'top', shortcut: undefined });
</script>

<template>
	<PongTooltip :placement="placement" :show-after="500" :disabled>
		<template #content>
			<div :class="$style.shortcut">
				<div :class="$style.label">{{ label }}</div>
				<PongKeyboardShortcut v-if="shortcut" v-bind="shortcut" />
			</div>
		</template>
		<slot />
	</PongTooltip>
</template>

<style lang="scss" module>
.shortcut {
	display: flex;
	align-items: center;
	font-size: var(--font-size--2xs);
	gap: var(--spacing--2xs);

	--pong--kbd-bg: var(--color--white-alpha-300);
	--pong--kbd-border: transparent;
	--pong--kbd-text: var(--color--neutral-200);
}

.label {
	min-width: 0;
	font-size: var(--font-size--xs);
}
</style>
