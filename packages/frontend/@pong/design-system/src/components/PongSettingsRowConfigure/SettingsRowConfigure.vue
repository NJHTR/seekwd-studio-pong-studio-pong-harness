<script setup lang="ts">
import PongIcon from '../PongIcon';
import PongText from '../PongText';

export interface SettingsRowConfigureProps {
	/**
	 * The affordance text. Defaults to "Configure" (the not-configured state). Pass the
	 * configured-state free text (e.g. "2 of 3 devices", "Enabled", "pong.example.com") to
	 * replace the label once the setting is configured. The trailing chevron is always shown.
	 */
	value?: string;
}

defineOptions({ name: 'PongSettingsRowConfigure' });

withDefaults(defineProps<SettingsRowConfigureProps>(), {
	value: 'Configure',
});
</script>

<template>
	<span :class="$style.configure" data-test-id="settings-row-configure">
		<PongText :class="$style.value" size="small" color="text-dark">{{ value }}</PongText>
		<PongIcon :class="$style.chevron" icon="chevron-right" size="small" />
	</span>
</template>

<style lang="scss" module>
@use '../../css/mixins/utils';

.configure {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.value {
	min-width: 0;
	@include utils.utils-ellipsis;
}

.chevron {
	flex: 0 0 auto;
	color: var(--icon-color);
}
</style>
