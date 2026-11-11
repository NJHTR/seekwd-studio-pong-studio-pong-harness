<script setup lang="ts">
import { PongOption, PongSelect, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

const i18n = useI18n();

const props = defineProps<{
	defaultPool: string | null;
	availablePools: string[];
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:defaultPool': [value: string | null];
}>();

const onUpdate = (value: string) => {
	emit('update:defaultPool', value === '' ? '' : value);
};
</script>

<template>
	<fieldset class="project-worker-pools" data-test-id="project-worker-pools-section">
		<h3>
			<label for="projectDefaultPool">
				{{ i18n.baseText('projects.settings.workerPools.title') }}
			</label>
		</h3>

		<PongSelect
			id="projectDefaultPool"
			:model-value="props.defaultPool ?? ''"
			:disabled="props.disabled"
			:class="$style.input"
			data-test-id="project-default-pool-input"
			@update:model-value="onUpdate"
		>
			<PongOption :label="i18n.baseText('projects.settings.workerPools.defaultQueue')" :value="''" />
			<PongOption v-for="pool in props.availablePools" :key="pool" :label="pool" :value="pool" />
		</PongSelect>
		<PongText color="text-light" size="small" :class="$style.help">
			{{ i18n.baseText('projects.settings.workerPools.help') }}
		</PongText>
	</fieldset>
</template>

<style module lang="scss">
.input {
	max-width: var(--project-field--width);
}

.help {
	display: block;
	margin-top: var(--spacing--3xs);
}
</style>
