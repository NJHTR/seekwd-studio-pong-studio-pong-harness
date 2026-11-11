<script setup lang="ts">
import {
	PongIcon,
	PongSettingsRow,
	PongText,
	PongTooltip,
	type SettingsRowLayout,
} from '@pong/design-system';

defineOptions({ inheritAttrs: false });

withDefaults(
	defineProps<{
		title: string;
		description: string;
		envTooltip?: string;
		layout?: SettingsRowLayout;
		actionFill?: boolean;
		actionMaxWidth?: string | false;
		descriptionError?: boolean;
	}>(),
	{
		envTooltip: undefined,
		layout: 'horizontal',
		actionFill: false,
		actionMaxWidth: '50%',
		descriptionError: false,
	},
);
</script>

<template>
	<PongSettingsRow
		v-bind="$attrs"
		:layout="layout"
		:action-fill="actionFill"
		:action-max-width="actionMaxWidth"
	>
		<template #info>
			<div :class="$style.info">
				<div :class="$style.title">
					<PongText bold size="medium" color="text-dark">
						{{ title }}
					</PongText>
					<PongTooltip v-if="envTooltip" :content="envTooltip" placement="top">
						<span :class="$style.envInfo" role="img" tabindex="0" :aria-label="envTooltip">
							<PongIcon icon="circle-help" size="small" />
						</span>
					</PongTooltip>
				</div>
				<PongText
					size="small"
					:color="descriptionError ? 'danger' : 'text-light'"
					:data-test-id="descriptionError ? 'otel-settings-row-error' : undefined"
				>
					{{ description }}
				</PongText>
			</div>
		</template>
		<template #action>
			<slot name="action" />
		</template>
	</PongSettingsRow>
</template>

<style lang="scss" module>
.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.envInfo {
	display: inline-flex;
	align-items: center;
	color: var(--icon-color);
	border-radius: var(--radius--4xs);

	&:hover,
	&:focus-visible {
		color: var(--icon-color--strong);
	}

	&:focus-visible {
		outline: var(--border-width) solid var(--border-color--strong);
		outline-offset: var(--spacing--4xs);
	}
}
</style>
