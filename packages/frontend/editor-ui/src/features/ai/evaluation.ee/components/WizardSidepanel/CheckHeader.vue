<script setup lang="ts">
import { PongBadge, PongIcon, PongText } from '@pong/design-system';
import type { IconName } from '@pong/design-system';

defineProps<{
	icon: IconName;
	iconBg?: string;
	iconFg?: string;
	title: string;
	badge?: string;
	badgeIcon?: IconName;
}>();
</script>

<template>
	<div :class="$style.header">
		<span
			:class="[$style.icon, !iconBg && !iconFg ? $style.iconNeutral : null]"
			:style="iconBg || iconFg ? { backgroundColor: iconBg, color: iconFg } : null"
		>
			<PongIcon :icon="icon" size="small" />
		</span>
		<div :class="$style.body">
			<div :class="$style.titleRow">
				<PongText size="small" bold color="text-dark">
					{{ title }}
				</PongText>
				<PongBadge v-if="badge" :class="$style.judgePill">
					<PongIcon v-if="badgeIcon" :icon="badgeIcon" size="xsmall" :class="$style.judgePillIcon" />
					{{ badge }}
				</PongBadge>
			</div>
			<slot name="description" />
		</div>
	</div>
</template>

<style module lang="scss">
.header {
	display: grid;
	grid-template-columns: auto 1fr;
	align-items: flex-start;
	gap: var(--spacing--xs);
	min-width: 0;
}

.icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: var(--radius--2xs);
}

.iconNeutral {
	background-color: var(--background--subtle);
	color: var(--color--text--tint-1);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.judgePill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	background-color: var(--background--subtle);
	color: var(--color--text--tint-1);
	border: none;
	font-size: var(--font-size--3xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--full);
	line-height: 1.2;
	font-weight: var(--font-weight--medium);
}

.judgePillIcon {
	flex-shrink: 0;
}
</style>
