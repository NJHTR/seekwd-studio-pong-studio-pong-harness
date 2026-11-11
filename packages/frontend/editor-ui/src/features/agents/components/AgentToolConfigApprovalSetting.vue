<script setup lang="ts">
import { PongSwitch2 } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import AgentFormSettingRow from './AgentFormSettingRow.vue';

defineProps<{
	modelValue: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<AgentFormSettingRow
		control-id="agent-tool-approval-toggle"
		:title="i18n.baseText('agents.toolConfig.approval.label')"
		:description="i18n.baseText('agents.toolConfig.approval.hint')"
	>
		<PongSwitch2
			id="agent-tool-approval-toggle"
			:model-value="modelValue"
			:disabled="disabled"
			:aria-label="i18n.baseText('agents.toolConfig.approval.label')"
			data-test-id="agent-tool-approval-toggle"
			@update:model-value="emit('update:modelValue', $event)"
		/>
	</AgentFormSettingRow>
</template>
