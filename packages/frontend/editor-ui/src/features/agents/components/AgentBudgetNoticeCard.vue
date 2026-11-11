<script setup lang="ts">
import { computed, ref } from 'vue';
import { PongButton, PongCard, PongInputNumber, PongText } from '@pong/design-system';
import { useI18n, type BaseTextKey } from '@pong/i18n';

import { useAiGatewayTopUp } from '@/app/composables/useAiGatewayTopUp';

import {
	parseBudgetAmount,
	type BudgetAmountField,
	type BudgetNoticeCode,
} from '../utils/budget-config';

const COPY: Record<
	BudgetNoticeCode,
	{ title: BaseTextKey; message: BaseTextKey; input?: BaseTextKey; dismissed: BaseTextKey }
> = {
	'budget.monthly': {
		title: 'agents.chat.budget.monthly.title',
		message: 'agents.chat.budget.monthly.message',
		input: 'agents.chat.budget.monthly.input',
		dismissed: 'agents.chat.budget.monthly.dismissed',
	},
	'budget.session': {
		title: 'agents.chat.budget.session.title',
		message: 'agents.chat.budget.session.message',
		input: 'agents.chat.budget.session.input',
		dismissed: 'agents.chat.budget.session.dismissed',
	},
	'budget.alert': {
		title: 'agents.chat.budget.alert.title',
		message: 'agents.chat.budget.alert.message',
		input: 'agents.chat.budget.alert.input',
		dismissed: 'agents.chat.budget.alert.dismissed',
	},
	'budget.credits': {
		title: 'agents.chat.budget.credits.title',
		message: 'agents.chat.budget.credits.message',
		dismissed: 'agents.chat.budget.credits.dismissed',
	},
};

const props = withDefaults(
	defineProps<{
		code: BudgetNoticeCode;
		/** False when the user cannot edit the agent — the increase action is hidden. */
		canIncrease?: boolean;
		/** True while the cap increase is being saved. */
		pending?: boolean;
	}>(),
	{ canIncrease: false, pending: false },
);

const emit = defineEmits<{
	increase: [payload: { field: BudgetAmountField; amount: number }];
}>();

const i18n = useI18n();
const { openTopUp } = useAiGatewayTopUp();
const dismissed = ref(false);
const amount = ref<number | undefined>();

const copy = computed(() => COPY[props.code]);
const isCredits = computed(() => props.code === 'budget.credits');
const field = computed<BudgetAmountField>(() =>
	props.code === 'budget.session' ? 'sessionCostCapUsd' : 'monthlyBudgetUsd',
);

function onAmount(value: number | null | undefined) {
	amount.value = parseBudgetAmount(value);
}

function increase() {
	const value = amount.value;
	if (value === undefined || props.pending) return;
	emit('increase', { field: field.value, amount: value });
}

function topUp() {
	void openTopUp({ source: 'agent_budget_card' });
}
</script>

<template>
	<PongCard :class="$style.card" data-testid="agent-budget-notice-card">
		<div :class="$style.body">
			<PongText tag="p" bold :class="$style.title" data-testid="agent-budget-notice-title">
				{{ i18n.baseText(copy.title) }}
			</PongText>
			<PongText tag="p" size="small" :class="$style.message">
				{{ i18n.baseText(copy.message) }}
			</PongText>
			<PongText v-if="dismissed" size="small" data-testid="agent-budget-notice-dismissed">
				{{ i18n.baseText(copy.dismissed) }}
			</PongText>
			<template v-else>
				<label v-if="canIncrease && copy.input !== undefined" :class="$style.amount">
					<PongText size="small">{{ i18n.baseText(copy.input) }}</PongText>
					<PongInputNumber
						:model-value="amount"
						:min="0"
						:controls="false"
						:disabled="pending"
						data-testid="agent-budget-notice-amount"
						@update:model-value="onAmount"
					>
						<template #prefix>{{ i18n.baseText('agents.builder.budget.currencyPrefix') }}</template>
					</PongInputNumber>
				</label>
				<div :class="$style.actions">
					<PongButton
						variant="outline"
						size="medium"
						:disabled="pending"
						data-testid="agent-budget-notice-not-now"
						@click="dismissed = true"
					>
						{{ i18n.baseText('agents.chat.budget.notNow') }}
					</PongButton>
					<PongButton
						v-if="isCredits"
						size="medium"
						data-testid="agent-budget-notice-top-up"
						@click="topUp"
					>
						{{ i18n.baseText('agents.chat.budget.credits.topUp') }}
					</PongButton>
					<PongButton
						v-else-if="canIncrease"
						size="medium"
						:loading="pending"
						data-testid="agent-budget-notice-increase"
						@click="increase"
					>
						{{ i18n.baseText('agents.chat.budget.increase') }}
					</PongButton>
				</div>
			</template>
		</div>
	</PongCard>
</template>

<style lang="scss" module>
.card {
	--card--padding: var(--spacing--sm);

	width: 90%;
	max-width: 90%;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.title,
.message {
	margin: 0;
}

.title {
	font-size: var(--font-size--sm);
}

.amount {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
}
</style>
