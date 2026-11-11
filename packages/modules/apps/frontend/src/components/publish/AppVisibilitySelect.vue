<script setup lang="ts">
import type { AppVisibility } from '@pong/api-types';
import { PongIcon, PongInputLabel, PongOption, PongSelect, type IconName } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

const OPTIONS: Array<{ value: AppVisibility; icon: IconName }> = [
	{ value: 'project', icon: 'users' },
	{ value: 'instance', icon: 'shield' },
];

defineProps<{ disabled?: boolean }>();

const visibility = defineModel<AppVisibility>({ required: true });

const i18n = useI18n();

const selectedIcon = computed(
	() => OPTIONS.find(({ value }) => value === visibility.value)?.icon ?? 'users',
);
</script>

<template>
	<div :class="$style.visibility">
		<PongInputLabel :label="i18n.baseText('apps.visibility.label')" size="small" color="text-dark">
			<PongSelect v-model="visibility" :disabled="disabled" data-test-id="app-visibility-select">
				<template #prefix>
					<PongIcon :icon="selectedIcon" />
				</template>
				<PongOption
					v-for="option in OPTIONS"
					:key="option.value"
					:value="option.value"
					:label="i18n.baseText(`apps.visibility.${option.value}`)"
					:data-test-id="`app-visibility-option-${option.value}`"
				>
					<span :class="$style.option">
						<PongIcon :icon="option.icon" />
						{{ i18n.baseText(`apps.visibility.${option.value}`) }}
					</span>
				</PongOption>
			</PongSelect>
		</PongInputLabel>
		<slot />
	</div>
</template>

<style lang="scss" module>
.visibility {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
