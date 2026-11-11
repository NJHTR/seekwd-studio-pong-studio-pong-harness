<script lang="ts" setup>
import { PongText, PongIcon } from '@pong/design-system';
import { useI18n, type BaseTextKey } from '@pong/i18n';

const i18n = useI18n();

const props = withDefaults(
	defineProps<{
		titleKey?: BaseTextKey;
		showTitleIcon?: boolean;
	}>(),
	{
		titleKey: 'instanceAi.emptyState.title',
		showTitleIcon: false,
	},
);
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-empty-state">
		<PongText tag="h1" size="xlarge" bold :class="$style.title">
			<PongIcon v-if="props.showTitleIcon" icon="pong-assistant" :class="$style.titleIcon" />
			{{ i18n.baseText(props.titleKey) }}
		</PongText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.title {
	display: flex;
	align-items: center;
	text-align: center;
}

.titleIcon {
	margin-right: var(--spacing--2xs);
}
</style>
