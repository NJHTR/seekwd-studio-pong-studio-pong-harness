<script setup lang="ts">
/**
 * One drafted case in read mode: the request, and in plain language what a good
 * answer does. The check is advisory — nothing grades against it automatically —
 * so it reads as a note rather than an assertion.
 */
import { PongIcon, PongIconButton, PongText, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

const props = defineProps<{
	/** 1-based position shown to the user, not the row id. */
	index: number;
	input: string;
	/** Null when the dataset maps no check column, in which case the line is omitted. */
	whatToCheck: string | null;
	editable?: boolean;
}>();

const emit = defineEmits<{
	edit: [];
}>();

const i18n = useI18n();

const editLabel = computed(() =>
	i18n.baseText('agents.builder.agentEvals.cases.editCase', {
		interpolate: { index: String(props.index) },
	}),
);
</script>

<template>
	<div :class="$style.row" data-testid="agent-evals-case-row">
		<PongText size="small" color="text-light" :class="$style.index">{{ index }}</PongText>

		<div :class="$style.body">
			<PongText size="small" color="text-dark">{{ input }}</PongText>
			<div v-if="whatToCheck" :class="$style.check">
				<PongIcon icon="circle-check" size="small" :class="$style.checkIcon" />
				<PongText size="small" color="text-light">{{ whatToCheck }}</PongText>
			</div>
		</div>

		<PongTooltip v-if="editable" :content="editLabel">
			<PongIconButton
				icon="pencil"
				variant="ghost"
				size="small"
				type="button"
				:aria-label="editLabel"
				data-testid="agent-evals-case-edit"
				@click="emit('edit')"
			/>
		</PongTooltip>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
}

/* Fixed measure so the requests line up regardless of how many cases there are. */
.index {
	flex-shrink: 0;
	min-width: var(--spacing--sm);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.check {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--4xs);
}

.checkIcon {
	flex-shrink: 0;
	color: var(--color--success);
}
</style>
