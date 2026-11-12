<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import {
	PongApprovalCard,
	PongCodeBlock,
	PongInput,
	PongRadioGroup,
	PongRadioGroupItem,
	PongText,
	type ApprovalCardLabels,
	type ApprovalOption,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';

import { useApprovalCardLabels } from '@/app/composables/useApprovalCardLabels';
import { TIME } from '@/app/constants/durations';
import type { AgentsChatHostEvent } from '@/features/ai/shared/agentsChat/types';

import { decideEasycodeApproval } from '../composables/useAgentApi';
import { isApprovalGoneError } from '../utils/errors';
import {
	buildEasycodeApprovalAnswers,
	parseEasycodeApprovalPayload,
} from './easycodeApproval';
import {
	EASYCODE_APPROVAL_DECISION,
	EASYCODE_APPROVAL_REQUEST_KIND,
	EASYCODE_SYSTEM_AGENT_ID,
	type EasycodeApprovalAnswers,
	type EasycodeApprovalDecision,
	type EasycodeApprovalRequestKind,
} from './easycodeApproval.types';

const props = defineProps<{ event: AgentsChatHostEvent }>();

const i18n = useI18n();
const rootStore = useRootStore();
const approvalLabels = useApprovalCardLabels();

const payload = computed(() => parseEasycodeApprovalPayload(props.event.payload));

/** Local progress of the decision. A finished card keeps its result. */
type ApprovalStatus =
	| 'open'
	| 'pending'
	| 'approved'
	| 'approvedForSession'
	| 'denied'
	| 'invalid'
	| 'expired'
	| 'failed';

interface ApprovalStatusNotice {
	title: string;
	description?: string;
	/** A `PongText` color: notice text does not need a themed callout. */
	color: 'danger' | 'warning' | 'text-light';
}

const status = ref<ApprovalStatus>('open');
const selectedOption = ref<string>();
const answerText = ref('');
const answerError = ref<string>();
const nowMs = ref(Date.now());
/** The command block starts open: the command is the subject of the approval. */
const isCommandCollapsed = ref(false);

// One tick a second keeps the countdown honest without a per-frame render.
const { pause: stopCountdown } = useIntervalFn(() => {
	nowMs.value = Date.now();
}, TIME.SECOND);

const deadlineMs = computed(() => payload.value?.expiresAtMs ?? 0);
const hasDeadline = computed(() => deadlineMs.value > 0);
const isPastDeadline = computed(() => hasDeadline.value && nowMs.value >= deadlineMs.value);

/**
 * The countdown decides an untouched card, and a failed card whose deadline
 * passed. A request in flight stays pending: its response is authoritative.
 */
const effectiveStatus = computed<ApprovalStatus>(() => {
	if (isPastDeadline.value && (status.value === 'open' || status.value === 'failed')) {
		return 'expired';
	}
	return status.value;
});

const resolvedDecision = computed<'allowed' | 'denied' | undefined>(() => {
	if (effectiveStatus.value === 'denied') return 'denied';
	if (effectiveStatus.value === 'approved' || effectiveStatus.value === 'approvedForSession') {
		return 'allowed';
	}
	return undefined;
});

const isDecisionDisabled = computed(() => {
	const current = effectiveStatus.value;
	return (
		current === 'pending' ||
		current === 'invalid' ||
		current === 'expired' ||
		resolvedDecision.value !== undefined
	);
});

// A finished card needs no further ticks. A failed card keeps them, so a
// retry after the deadline still shows the unknown result.
watch(effectiveStatus, (current) => {
	if (
		current === 'approved' ||
		current === 'approvedForSession' ||
		current === 'denied' ||
		current === 'invalid' ||
		current === 'expired'
	) {
		stopCountdown();
	}
});

const REQUEST_KIND_TITLE_KEYS: Record<EasycodeApprovalRequestKind, string> = {
	[EASYCODE_APPROVAL_REQUEST_KIND.COMMAND]: 'agents.easycodeApproval.title.command',
	[EASYCODE_APPROVAL_REQUEST_KIND.FILE_CHANGE]: 'agents.easycodeApproval.title.fileChange',
	[EASYCODE_APPROVAL_REQUEST_KIND.PERMISSIONS]: 'agents.easycodeApproval.title.permissions',
	[EASYCODE_APPROVAL_REQUEST_KIND.INPUT]: 'agents.easycodeApproval.title.input',
};

const titleText = computed(() => {
	const current = payload.value;
	if (!current) return i18n.baseText('agents.easycodeApproval.title.approval');
	return i18n.baseText(REQUEST_KIND_TITLE_KEYS[current.requestKind]);
});

const labels = computed<ApprovalCardLabels>(() => ({
	...approvalLabels.value,
	...(effectiveStatus.value === 'approvedForSession'
		? { allowed: i18n.baseText('agents.easycodeApproval.approvedForSession') }
		: {}),
}));

function decisionOption(decision: EasycodeApprovalDecision): ApprovalOption {
	const testId = `easycode-approval-${decision}`;
	if (decision === EASYCODE_APPROVAL_DECISION.DECLINE) {
		return {
			key: decision,
			icon: 'ban',
			label: labels.value.deny,
			withArrow: false,
			testId,
		};
	}
	if (decision === EASYCODE_APPROVAL_DECISION.ACCEPT_FOR_SESSION) {
		return {
			key: decision,
			icon: 'check-check',
			label: labels.value.alwaysAllow,
			suffix: labels.value.alwaysAllowSuffix,
			testId,
		};
	}
	return { key: decision, icon: 'check', label: labels.value.allowOnce, testId };
}

const options = computed<ApprovalOption[]>(
	() => payload.value?.availableDecisions.map(decisionOption) ?? [],
);

const statusNotice = computed<ApprovalStatusNotice | undefined>(() => {
	switch (effectiveStatus.value) {
		case 'pending':
			return { title: i18n.baseText('agents.easycodeApproval.pending'), color: 'text-light' };
		case 'invalid':
			return {
				title: i18n.baseText('agents.easycodeApproval.invalid.title'),
				description: i18n.baseText('agents.easycodeApproval.invalid.description'),
				color: 'danger',
			};
		case 'expired':
			return {
				title: i18n.baseText('agents.easycodeApproval.expired.title'),
				description: i18n.baseText('agents.easycodeApproval.expired.description'),
				color: 'warning',
			};
		case 'failed':
			return {
				title: i18n.baseText('agents.easycodeApproval.failed.title'),
				description: i18n.baseText('agents.easycodeApproval.failed.description'),
				color: 'danger',
			};
		default:
			return undefined;
	}
});

function formatRemainingTime(remainingMs: number): string {
	const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const countdownText = computed(() => {
	if (!hasDeadline.value) return undefined;
	if (effectiveStatus.value !== 'open' && effectiveStatus.value !== 'pending') return undefined;
	const remaining = Math.max(0, deadlineMs.value - nowMs.value);
	return i18n.baseText('agents.easycodeApproval.expiresIn', {
		interpolate: { time: formatRemainingTime(remaining) },
	});
});

const isInput = computed(
	() => payload.value?.requestKind === EASYCODE_APPROVAL_REQUEST_KIND.INPUT,
);

const reasonText = computed(() => payload.value?.reason ?? payload.value?.detail);

/** The detail that the reason does not already show. */
const detailText = computed(() => {
	const current = payload.value;
	if (!current?.detail || current.detail === current.reason) return undefined;
	return current.detail;
});

const questionText = computed(() => payload.value?.question);

const inputOptions = computed<readonly string[]>(() => payload.value?.options ?? []);

const hasDescriptionContent = computed(
	() =>
		Boolean(payload.value?.command) ||
		Boolean(payload.value?.cwd) ||
		reasonText.value !== undefined ||
		detailText.value !== undefined ||
		isInput.value ||
		statusNotice.value?.description !== undefined,
);

watch(selectedOption, (value) => {
	if (value === undefined) return;
	answerText.value = '';
	answerError.value = undefined;
});

watch(answerText, (value) => {
	if (!value.trim()) return;
	selectedOption.value = undefined;
	answerError.value = undefined;
});

const currentAnswer = computed<string | undefined>(() => {
	const typed = answerText.value.trim();
	return typed || selectedOption.value;
});

function isDecision(value: string): value is EasycodeApprovalDecision {
	return (
		value === EASYCODE_APPROVAL_DECISION.ACCEPT ||
		value === EASYCODE_APPROVAL_DECISION.DECLINE ||
		value === EASYCODE_APPROVAL_DECISION.ACCEPT_FOR_SESSION
	);
}

async function submitDecision(decision: EasycodeApprovalDecision): Promise<void> {
	const current = payload.value;
	if (!current || isDecisionDisabled.value) return;

	answerError.value = undefined;
	let answers: EasycodeApprovalAnswers | undefined;
	if (isInput.value && decision !== EASYCODE_APPROVAL_DECISION.DECLINE) {
		const answer = currentAnswer.value;
		if (answer === undefined) {
			answerError.value = i18n.baseText('agents.easycodeApproval.answerRequired');
			return;
		}
		answers = buildEasycodeApprovalAnswers(current, answer);
	}

	status.value = 'pending';
	try {
		await decideEasycodeApproval(rootStore.restApiContext, {
			agentId: EASYCODE_SYSTEM_AGENT_ID,
			threadId: current.threadId,
			approvalId: current.approvalId,
			decision,
			...(answers !== undefined ? { answers } : {}),
		});
		if (decision === EASYCODE_APPROVAL_DECISION.DECLINE) {
			status.value = 'denied';
		} else if (decision === EASYCODE_APPROVAL_DECISION.ACCEPT_FOR_SESSION) {
			status.value = 'approvedForSession';
		} else {
			status.value = 'approved';
		}
	} catch (error) {
		status.value = isApprovalGoneError(error) ? 'invalid' : 'failed';
	}
}

function onSelect(key: string): void {
	if (!isDecision(key)) return;
	void submitDecision(key);
}
</script>

<template>
	<!-- `autoFocus` is off: history can hold several cards, and none should take focus on load. -->
	<PongApprovalCard
		:title="titleText"
		:labels="labels"
		:options="options"
		:decision="resolvedDecision"
		:disabled="isDecisionDisabled"
		:auto-focus="false"
		data-test-id="easycode-approval-card"
		@select="onSelect"
	>
		<template #title>
			<span :class="$style.title">
				<PongText step="sm" bold>{{ titleText }}</PongText>
				<PongText
					v-if="countdownText"
					step="sm"
					color="text-light"
					data-test-id="easycode-approval-countdown"
				>
					{{ countdownText }}
				</PongText>
				<PongText
					v-if="statusNotice"
					step="sm"
					:color="statusNotice.color"
					data-test-id="easycode-approval-status"
				>
					{{ statusNotice.title }}
				</PongText>
			</span>
		</template>

		<template v-if="hasDescriptionContent" #description>
			<div :class="$style.content">
				<PongText
					v-if="statusNotice?.description"
					step="sm"
					:color="statusNotice.color"
					data-test-id="easycode-approval-status-description"
				>
					{{ statusNotice.description }}
				</PongText>

				<div v-if="reasonText" :class="$style.field">
					<PongText step="sm" color="text-light">
						{{ i18n.baseText('agents.easycodeApproval.reason') }}
					</PongText>
					<PongText step="sm" data-test-id="easycode-approval-reason">{{ reasonText }}</PongText>
				</div>

				<div v-if="detailText" :class="$style.field">
					<PongText step="sm" color="text-light">
						{{ i18n.baseText('agents.easycodeApproval.detail') }}
					</PongText>
					<PongText step="sm" data-test-id="easycode-approval-detail">{{ detailText }}</PongText>
				</div>

				<div v-if="payload?.command" :class="$style.field">
					<PongText step="sm" color="text-light">
						{{ i18n.baseText('agents.easycodeApproval.command') }}
					</PongText>
					<PongCodeBlock
						v-model:collapsed="isCommandCollapsed"
						:code="payload.command"
						language="bash"
						data-test-id="easycode-approval-command"
					/>
				</div>

				<div v-if="payload?.cwd" :class="$style.field">
					<PongText step="sm" color="text-light">
						{{ i18n.baseText('agents.easycodeApproval.cwd') }}
					</PongText>
					<PongText step="sm" data-test-id="easycode-approval-cwd">
						<code :class="$style.codeText">{{ payload.cwd }}</code>
					</PongText>
				</div>

				<div v-if="questionText" :class="$style.field">
					<PongText step="sm" color="text-light">
						{{ i18n.baseText('agents.easycodeApproval.question') }}
					</PongText>
					<PongText step="sm" data-test-id="easycode-approval-question">{{ questionText }}</PongText>
				</div>

				<PongRadioGroup
					v-if="inputOptions.length > 0"
					v-model="selectedOption"
					:disabled="isDecisionDisabled"
					:class="$style.options"
					data-test-id="easycode-approval-options"
				>
					<PongRadioGroupItem
						v-for="option in inputOptions"
						:key="option"
						:value="option"
						:label="option"
						:disabled="isDecisionDisabled"
					/>
				</PongRadioGroup>

				<div v-if="isInput" :class="$style.field">
					<PongText step="sm" color="text-light">
						{{ i18n.baseText('agents.easycodeApproval.answer') }}
					</PongText>
					<PongInput
						v-model="answerText"
						type="textarea"
						:rows="2"
						size="small"
						:disabled="isDecisionDisabled"
						:placeholder="i18n.baseText('agents.easycodeApproval.answerPlaceholder')"
						data-test-id="easycode-approval-answer"
					/>
					<PongText step="sm" color="text-light">
						{{ i18n.baseText('agents.easycodeApproval.inputHint') }}
					</PongText>
				</div>

				<PongText
					v-if="answerError"
					step="sm"
					color="danger"
					data-test-id="easycode-approval-answer-error"
				>
					{{ answerError }}
				</PongText>
			</div>
		</template>
	</PongApprovalCard>
</template>

<style lang="scss" module>
.title {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow-wrap: anywhere;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow-wrap: anywhere;
}

.options {
	display: flex;
}

.codeText {
	font-family: var(--font-family--monospace);
	overflow-wrap: anywhere;
}
</style>
