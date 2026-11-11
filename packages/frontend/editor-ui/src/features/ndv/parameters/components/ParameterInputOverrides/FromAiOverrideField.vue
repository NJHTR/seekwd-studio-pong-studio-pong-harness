<script setup lang="ts">
import { PongIcon, PongIconButton, PongTag, PongText } from '@pong/design-system';
import { i18n } from '@pong/i18n';
import ParameterIssues from '../ParameterIssues.vue';

defineProps<{
	isReadOnly?: boolean;
	issues?: string[];
}>();

const emit = defineEmits<{ close: [] }>();
</script>

<template>
	<div :class="$style.field" data-test-id="fromAI-override-field">
		<PongTag
			:text="i18n.baseText('parameterOverride.overridePanelText')"
			:clickable="false"
			size="md"
			:class="$style.tag"
		>
			<template #tag>
				<PongIcon icon="sparkles" size="small" :class="$style.icon" />
				<PongText size="small" :class="$style.label">
					{{ i18n.baseText('parameterOverride.overridePanelText') }}
				</PongText>
				<PongIconButton
					v-if="!isReadOnly"
					icon="x"
					variant="ghost"
					size="xsmall"
					:class="$style.remove"
					:aria-label="i18n.baseText('parameterOverride.editValue')"
					@click="emit('close')"
				/>
			</template>
		</PongTag>
		<ParameterIssues v-if="issues?.length" :class="$style.issues" :issues="issues" />
	</div>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/_input.scss' as input;

.field {
	@include input.size-variables('small');
	@include input.theme-variables;
	display: flex;
	align-items: center;
	width: 100%;
	height: var(--input--height);
	box-sizing: border-box;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs);
	border-radius: var(--input--radius);
	background-color: var(--input--color--background);
	box-shadow: inset var(--input--border--shadow);
}

.tag {
	--tag--min-width: 0;
	--tag--max-width: 100%;
	gap: var(--spacing--3xs);
	height: 100%;
	min-height: 0;
	padding-block: 0;
}

.issues {
	margin-left: auto;
}

.icon {
	flex-shrink: 0;
}

.label {
	min-width: 0;
	line-height: var(--line-height--md);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.remove {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}
</style>
