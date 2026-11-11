<script setup lang="ts">
import { PongSwitch2, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import shared from '../styles/agent-panel.module.scss';

defineProps<{
	availableInMcp: boolean;
	disabled: boolean;
}>();

const emit = defineEmits<{
	'toggle-mcp-access': [enabled: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.mcpPanel">
		<div :class="shared.settingRow">
			<div :class="shared.settingLabel">
				<PongText step="sm" bold :class="shared.dataEntryLabel">
					{{ i18n.baseText('agents.builder.mcp.availableInMCP.label') }}
				</PongText>
				<PongText size="small" :class="shared.dataEntrySubLabel">
					{{ i18n.baseText('agents.builder.mcp.availableInMCP.hint') }}
				</PongText>
			</div>
			<PongSwitch2
				:model-value="availableInMcp"
				:disabled="disabled"
				:class="shared.settingControl"
				data-testid="agent-available-in-mcp-toggle"
				@update:model-value="(value: boolean) => emit('toggle-mcp-access', value)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.mcpPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}
</style>
