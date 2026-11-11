<script setup lang="ts">
import { PongIconButton, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

const i18n = useI18n();

withDefaults(
	defineProps<{
		position?: 'inline' | 'standalone';
		size?: 'small' | 'medium';
	}>(),
	{ position: 'inline', size: 'medium' },
);

const emit = defineEmits<{
	click: [];
}>();
</script>

<template>
	<PongTooltip>
		<template #content>
			<div>{{ i18n.baseText('parameterOverride.applyOverrideButtonTooltip') }}</div>
		</template>

		<PongIconButton
			icon="sparkles"
			variant="ghost"
			:size="size"
			icon-size="small"
			:class="[$style.overrideButton, $style[position], $style[size]]"
			:aria-label="i18n.baseText('parameterOverride.applyOverrideButtonTooltip')"
			data-test-id="from-ai-override-button"
			@click="emit('click')"
		/>
	</PongTooltip>
</template>

<style lang="scss" module>
.overrideButton {
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--from-ai-button-size);
	width: var(--from-ai-button-size);
	background-color: var(--color--foreground);
	color: var(--color--foreground--shade-2);
	cursor: pointer;
	border: 0;

	&:hover {
		background-color: var(--color--secondary);

		svg {
			// ensure enough contrast in both light and dark mode
			color: var(--color--neutral-250);
		}
	}
}

.small {
	--from-ai-button-size: var(--height--sm);
}

.medium {
	--from-ai-button-size: var(--height--md);
}

.overrideButton.inline {
	border-left: 0;
	border-radius: 0 var(--radius) var(--radius) 0;
}

.overrideButton.standalone {
	background-color: var(--color--foreground);
	border-top: 0;
	border-radius: var(--radius) var(--radius) 0 0;
}
</style>
