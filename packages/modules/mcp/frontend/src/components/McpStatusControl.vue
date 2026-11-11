<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@pong/i18n';
import { PongButton, PongDropdownMenu, PongIcon, PongText, PongTooltip } from '@pong/design-system';

const props = withDefaults(
	defineProps<{
		/** User cannot toggle MCP (member, or setting managed by env). */
		disabled?: boolean;
		loading?: boolean;
		managedByEnv?: boolean;
	}>(),
	{ disabled: false, loading: false, managedByEnv: false },
);

const emit = defineEmits<{ disable: [] }>();

const i18n = useI18n();

const disabledTooltip = computed(() =>
	props.managedByEnv
		? i18n.baseText('settings.mcp.managedByEnv.tooltip')
		: i18n.baseText('settings.mcp.toggle.disabled.tooltip'),
);

// The leading icon is rendered by the #item-leading slot below, so the item
// itself carries no icon.
const menuItems = computed(() => [
	{
		id: 'disable',
		label: i18n.baseText('settings.mcp.status.disable'),
	},
]);

const onSelect = (id: string) => {
	if (id === 'disable') emit('disable');
};
</script>

<template>
	<PongTooltip :content="disabledTooltip" :disabled="!props.disabled" placement="top">
		<PongDropdownMenu
			:items="menuItems"
			placement="bottom-end"
			:disabled="props.disabled || props.loading"
			data-test-id="mcp-status-control"
			@select="onSelect"
		>
			<template #trigger>
				<PongButton
					variant="outline"
					size="medium"
					:disabled="props.disabled"
					:loading="props.loading"
					:aria-label="i18n.baseText('settings.mcp.status.ariaLabel')"
					data-test-id="mcp-status-control-trigger"
				>
					<span :class="$style.dot" />
					{{ i18n.baseText('settings.mcp.header.toggle.enabled') }}
					<PongIcon icon="chevron-down" size="small" />
				</PongButton>
			</template>
			<template #item-leading>
				<PongIcon icon="power" size="large" color="danger" />
			</template>
			<template #item-label="{ item }">
				<PongText size="medium" color="danger" data-test-id="mcp-status-disable-item">
					{{ item.label }}
				</PongText>
			</template>
		</PongDropdownMenu>
	</PongTooltip>
</template>

<style lang="scss" module>
.dot {
	width: 8px;
	height: 8px;
	flex-shrink: 0;
	border-radius: 50%;
	background-color: var(--color--success);
	animation: mcp-status-pulse 2s ease-in-out infinite;
}

@keyframes mcp-status-pulse {
	50% {
		opacity: 0.4;
	}
}

@media (prefers-reduced-motion: reduce) {
	.dot {
		animation: none;
	}
}
</style>
