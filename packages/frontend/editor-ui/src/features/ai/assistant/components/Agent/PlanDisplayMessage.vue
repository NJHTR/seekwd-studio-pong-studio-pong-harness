<script setup lang="ts">
import { computed, ref } from 'vue';

import { PongButton, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import type { PlanMode } from '../../assistant.types';

const props = withDefaults(
	defineProps<{
		message: PlanMode.PlanMessage;
		disabled?: boolean;
		showActions?: boolean;
	}>(),
	{
		showActions: true,
	},
);

const emit = defineEmits<{
	decision: [value: { action: 'approve' | 'reject' | 'modify'; feedback?: string }];
}>();

const i18n = useI18n();

// Prevent double-click
const isSubmitted = ref(false);

const plan = computed(() => props.message.data.plan);

function approve() {
	if (isSubmitted.value) return;
	isSubmitted.value = true;
	emit('decision', { action: 'approve' });
}
</script>

<template>
	<div :class="$style.message" data-test-id="plan-mode-plan-message">
		<div :class="$style.card">
			<!-- Summary (bold, no header) -->
			<PongText>{{ plan.summary }}</PongText>

			<!-- Trigger (inline label) -->
			<div :class="$style.triggerSection">
				<PongText>{{ i18n.baseText('aiAssistant.builder.planMode.plan.triggerLabel') }}:</PongText>
				<PongText tag="p">{{ plan.trigger }}</PongText>
			</div>

			<!-- Steps -->
			<ol :class="$style.steps">
				<li v-for="(step, idx) in plan.steps" :key="idx">
					<PongText>{{ step.description }}</PongText>
					<ul v-if="step.subSteps?.length" :class="$style.subSteps">
						<li v-for="(sub, subIdx) in step.subSteps" :key="subIdx">
							<PongText>{{ sub }}</PongText>
						</li>
					</ul>
				</li>
			</ol>

			<!-- Notes (if present) -->
			<div v-if="plan.additionalSpecs?.length" :class="$style.section">
				<PongText>{{ i18n.baseText('aiAssistant.builder.planMode.plan.notesLabel') }}</PongText>
				<ul :class="$style.notes">
					<li v-for="(note, idx) in plan.additionalSpecs" :key="idx">
						<PongText>{{ note }}</PongText>
					</li>
				</ul>
			</div>

			<!-- Actions (only if showActions) - just Implement button, users can type in chat to modify -->
			<div v-if="showActions" :class="$style.actions">
				<PongButton
					:disabled="disabled || isSubmitted"
					data-test-id="plan-mode-plan-approve"
					@click="approve"
				>
					{{ i18n.baseText('aiAssistant.builder.planMode.actions.implement') }}
				</PongButton>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.message {
	margin-top: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
	line-height: var(--line-height--xl);
	font-size: var(--font-size--sm);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	border-radius: var(--radius--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.triggerSection {
	display: flex;
	gap: var(--spacing--4xs);
	align-items: baseline;
}

.steps {
	margin: 0;
	padding-left: var(--spacing--md);
	display: grid;
	gap: var(--spacing--2xs);
}

.subSteps {
	margin: var(--spacing--4xs) 0 0 0;
	padding-left: var(--spacing--md);
	display: grid;
	gap: var(--spacing--4xs);
}

.notes {
	margin: 0;
	padding-left: var(--spacing--md);
	display: grid;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
