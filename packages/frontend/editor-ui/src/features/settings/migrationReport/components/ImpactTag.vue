<script setup lang="ts">
import type { BreakingChangeRuleImpact } from '@pong/api-types';
import { PongBadge } from '@pong/design-system';
import type { BadgeVariant } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

defineOptions({ name: 'ImpactTag' });

defineProps<{
	impact: BreakingChangeRuleImpact;
}>();

const i18n = useI18n();

const labels = computed<Record<BreakingChangeRuleImpact, string>>(() => ({
	upgradeBlocked: i18n.baseText('settings.migrationReport.impact.upgradeBlocked'),
	executionsFail: i18n.baseText('settings.migrationReport.impact.executionsFail'),
	executionsMightFail: i18n.baseText('settings.migrationReport.impact.executionsMightFail'),
	behaviorChanges: i18n.baseText('settings.migrationReport.impact.behaviorChanges'),
	capabilityRemoved: i18n.baseText('settings.migrationReport.impact.capabilityRemoved'),
}));

// Danger for impacts that stop the instance or the executions, warning when
// runs continue with a different result or when only a default changes that the
// admin can override, neutral when nothing at runtime changes.
const badgeVariants: Record<BreakingChangeRuleImpact, BadgeVariant> = {
	upgradeBlocked: 'danger',
	executionsFail: 'danger',
	executionsMightFail: 'warning',
	behaviorChanges: 'warning',
	capabilityRemoved: 'outline',
};
</script>

<template>
	<PongBadge :variant="badgeVariants[impact]" data-test-id="migration-rule-impact-tag">
		{{ labels[impact] }}
	</PongBadge>
</template>
