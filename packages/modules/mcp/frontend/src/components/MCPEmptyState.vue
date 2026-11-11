<script setup lang="ts">
import { computed } from 'vue';
import { PongButton, PongEmptyState, PongIcon, PongTooltip } from '@pong/design-system';
import type { EmptyStateIconCards } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import { MCP_CLIENT_LOGO_CYCLE } from '../mcp.clients.catalog';
import { MCP_DOCS_PAGE_URL } from '../mcp.constants';

type Props = {
	disabled?: boolean;
	loading?: boolean;
	managedByEnv?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	loading: false,
	managedByEnv: false,
});

const emit = defineEmits<{
	turnOnMcp: [];
}>();

const i18n = useI18n();

const buttonDisabled = computed(() => props.disabled || props.loading);

// The MCP mark, flanked by side cards cycling through the client brand marks.
const emptyStateIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'mcp',
	sides: MCP_CLIENT_LOGO_CYCLE,
};
</script>

<template>
	<PongEmptyState
		:class="$style.emptyState"
		data-test-id="mcp-empty-state-container"
		:icon="emptyStateIcon"
		:heading="i18n.baseText('settings.mcp.actionBox.heading')"
		:description="i18n.baseText('settings.mcp.emptyState.description')"
	>
		<template #additionalContent>
			<div :class="$style.actions">
				<PongButton
					variant="ghost"
					size="medium"
					:href="MCP_DOCS_PAGE_URL"
					target="_blank"
					data-test-id="mcp-empty-state-learn-more"
				>
					{{ i18n.baseText('generic.learnMore') }}
					<PongIcon icon="arrow-up-right" size="small" />
				</PongButton>
				<PongTooltip :disabled="!buttonDisabled">
					<template #content>
						<span v-if="props.loading">{{ i18n.baseText('generic.loading') }}...</span>
						<span v-else-if="props.managedByEnv">
							{{ i18n.baseText('settings.mcp.managedByEnv.tooltip') }}
						</span>
						<span v-else>
							{{ i18n.baseText('settings.mcp.toggle.disabled.tooltip') }}
						</span>
					</template>
					<PongButton
						variant="solid"
						size="medium"
						:disabled="buttonDisabled"
						data-test-id="enable-mcp-access-button"
						@click="emit('turnOnMcp')"
					>
						{{ i18n.baseText('settings.mcp.actionBox.button.label') }}
					</PongButton>
				</PongTooltip>
			</div>
		</template>
	</PongEmptyState>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/motion';

.emptyState {
	margin-top: var(--spacing--xl);
	/* The DS card is transparent by default; keep the page's surface so it reads as a panel. */
	background: var(--background--surface);
	/* Fixed white tiles so the dark brand marks stay visible on the dark theme, as in the client rows. */
	--empty-state-icon-cards--tile-background: var(--color--neutral-white);
	--empty-state-icon-cards--tile-color: var(--color--neutral-black);
	/* Gentle entrance for the enable/disable swap (empty state ⇄ full page). */
	@include motion.fade-in-up;
}

.actions {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}
</style>
