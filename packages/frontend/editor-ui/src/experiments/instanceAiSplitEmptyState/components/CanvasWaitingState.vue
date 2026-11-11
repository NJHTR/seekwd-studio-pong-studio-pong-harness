<script lang="ts" setup>
import { PongInfoTip, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.waiting" data-test-id="instance-ai-canvas-loader">
		<div :class="$style.dots" aria-hidden="true">
			<span :class="$style.dot" />
			<span :class="$style.dot" />
			<span :class="$style.dot" />
		</div>
		<div :class="$style.text">
			<PongText size="small" :class="$style.hint">
				{{ i18n.baseText('experiments.instanceAiSplitEmptyState.canvas.ready') }}
			</PongText>
			<PongInfoTip type="note" theme="info" :bold="false" :class="$style.tip">
				<span :class="$style.tipLabel">{{
					i18n.baseText('experiments.instanceAiSplitEmptyState.canvas.tipLabel')
				}}</span>
				{{ i18n.baseText('experiments.instanceAiSplitEmptyState.canvas.tip') }}
			</PongInfoTip>
		</div>
	</div>
</template>

<style lang="scss" module>
.waiting {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
}

.dots {
	display: flex;
	gap: var(--spacing--2xs);
}

.dot {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: var(--color--primary);
	animation: waitingWave 1.3s ease-in-out infinite;

	&:nth-child(2) {
		animation-delay: 0.18s;
	}

	&:nth-child(3) {
		animation-delay: 0.36s;
	}
}

.text {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	max-width: 320px;
	text-align: center;
}

.hint {
	color: var(--color--text);
	font-weight: var(--font-weight--medium);
}

.tip {
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
}

.tipLabel {
	font-weight: var(--font-weight--medium);
	margin-right: var(--spacing--5xs);
}

@keyframes waitingWave {
	0%,
	100% {
		transform: translateY(0);
		opacity: 0.4;
	}
	40% {
		transform: translateY(-10px);
		opacity: 1;
	}
}
</style>
