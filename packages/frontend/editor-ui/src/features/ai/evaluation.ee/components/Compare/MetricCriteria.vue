<script setup lang="ts">
import {
	PongDialog,
	PongDialogBody,
	PongDialogHeader,
	PongDialogTitle,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, ref } from 'vue';

import { formatMetricLabel, getMetricDescriptionKey } from '../../evaluation.utils';

const props = defineProps<{
	metricKey: string;
	// The metric's custom LLM-judge criteria. Omitted for preset/non-judge metrics.
	prompt?: string;
}>();

const i18n = useI18n();
const isModalOpen = ref(false);

// Inline preview length before "Show more" opens the full rubric in a modal;
// judge prompts are often long enough to push the score chart off-screen.
const PREVIEW_CHARS = 120;

const description = computed(() => {
	const key = getMetricDescriptionKey(props.metricKey);
	return key ? i18n.baseText(key) : '';
});

const isLong = computed(() => (props.prompt?.length ?? 0) > PREVIEW_CHARS);

const previewText = computed(() => {
	if (!props.prompt) return '';
	if (!isLong.value) return props.prompt;
	return `${props.prompt.slice(0, PREVIEW_CHARS).trimEnd()}…`;
});

const modalTitle = computed(() => formatMetricLabel(props.metricKey));

// Split the free-form judge prompt on blank lines so each block renders as its own
// spaced paragraph; single newlines within a block are preserved via `pre-wrap`.
const promptParagraphs = computed(() =>
	(props.prompt ?? '')
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length > 0),
);
</script>

<template>
	<div v-if="description || prompt" :class="$style.wrap" data-test-id="metric-criteria">
		<PongText v-if="description" size="xsmall" color="text-light" :class="$style.text">
			{{ description }}
		</PongText>
		<PongText v-if="prompt" size="xsmall" color="text-light" :class="$style.text">
			<span :class="$style.label">{{ i18n.baseText('evaluation.metric.criteria.label') }}</span>
			{{ previewText }}
			<button
				v-if="isLong"
				type="button"
				:class="$style.toggle"
				data-test-id="metric-criteria-toggle"
				@click.stop="isModalOpen = true"
			>
				{{ i18n.baseText('evaluation.metric.criteria.showMore') }}
			</button>
		</PongText>

		<PongDialog :open="isModalOpen" size="large" @update:open="(value) => (isModalOpen = value)">
			<PongDialogHeader>
				<PongDialogTitle>{{ modalTitle }}</PongDialogTitle>
			</PongDialogHeader>
			<PongDialogBody>
				<div :class="$style.modalBody" data-test-id="metric-criteria-modal">
					<PongText v-if="description" size="small" color="text-base" :class="$style.paragraph">
						{{ description }}
					</PongText>
					<div :class="$style.criteria">
						<PongText size="xsmall" bold color="text-light" :class="$style.criteriaLabel">
							{{ i18n.baseText('evaluation.metric.criteria.label') }}
						</PongText>
						<PongText
							v-for="(paragraph, index) in promptParagraphs"
							:key="index"
							tag="p"
							size="small"
							color="text-base"
							:class="$style.paragraph"
						>
							{{ paragraph }}
						</PongText>
					</div>
				</div>
			</PongDialogBody>
		</PongDialog>
	</div>
</template>

<style module lang="scss">
.wrap {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	max-width: 320px;
}

.text {
	line-height: 1.3;
}

.label {
	font-weight: var(--font-weight--medium);
}

.toggle {
	border: none;
	background: none;
	padding: 0;
	margin-left: var(--spacing--4xs);
	color: var(--color--primary);
	cursor: pointer;
	font: inherit;
}

.modalBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	// Cap height so a long rubric scrolls inside the modal instead of growing past the viewport.
	max-height: 60vh;
	overflow-y: auto;
	// Keeps text off the scrollbar when the rubric overflows.
	padding-right: var(--spacing--2xs);
}

.criteria {
	display: flex;
	flex-direction: column;
	// Clear separation between the judge's instruction blocks.
	gap: var(--spacing--sm);
}

.criteriaLabel {
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.paragraph {
	margin: 0;
	line-height: 1.6;
	// Preserve single newlines within a block (e.g. a label above its value).
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
