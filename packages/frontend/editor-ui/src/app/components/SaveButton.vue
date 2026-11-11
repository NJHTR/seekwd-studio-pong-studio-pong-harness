<script lang="ts" setup>
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';
import type { ButtonVariant } from '@pong/design-system';

import { PongButton } from '@pong/design-system';

// Explicit click emit is required for Playwright tests - PongTooltip wraps
// content in a span (via TooltipTrigger), which can interfere with click
// event detection in automated tests
const emit = defineEmits<{
	click: [];
}>();

const props = withDefaults(
	defineProps<{
		saved: boolean;
		isSaving?: boolean;
		disabled?: boolean;
		variant?: ButtonVariant;
		withShortcut?: boolean;
		shortcutTooltip?: string;
		savingLabel?: string;
	}>(),
	{
		isSaving: false,
		variant: 'solid',
		withShortcut: false,
		disabled: false,
	},
);

const i18n = useI18n();

const saveButtonLabel = computed(() => {
	return props.isSaving
		? (props.savingLabel ?? i18n.baseText('saveButton.saving'))
		: i18n.baseText('saveButton.save');
});

const shortcutTooltipLabel = computed(() => {
	return props.shortcutTooltip ?? i18n.baseText('saveButton.save');
});
</script>

<template>
	<span :class="$style.container" data-test-id="save-button">
		<span v-if="saved" :class="$style.saved" @click.prevent.stop>{{
			i18n.baseText('saveButton.saved')
		}}</span>
		<template v-else>
			<KeyboardShortcutTooltip
				v-if="withShortcut"
				:label="shortcutTooltipLabel"
				:shortcut="{ keys: ['s'], metaKey: true }"
				placement="bottom"
			>
				<PongButton
					:label="saveButtonLabel"
					:loading="isSaving"
					:disabled="disabled"
					:variant="variant"
					@click="emit('click')"
				/>
			</KeyboardShortcutTooltip>
			<PongButton
				v-else
				:label="saveButtonLabel"
				:loading="isSaving"
				:disabled="disabled"
				:variant="variant"
				@click="emit('click')"
			/>
		</template>
	</span>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

.container {
	display: inline-flex;
	justify-content: center;
	align-items: center;
}

.saved {
	color: $custom-font-very-light;
	font-size: 12px;
	font-weight: var(--font-weight--medium);
	line-height: 12px;
	text-align: center;
	padding: var(--spacing--2xs) var(--spacing--2xs);
	min-width: 53px;
}
</style>
