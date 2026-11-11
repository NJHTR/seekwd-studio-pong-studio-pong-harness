<script setup lang="ts">
import { toRef } from 'vue';
import { PongText, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import WorkflowVersionStatusIndicator from './WorkflowVersionStatusIndicator.vue';
import type { PongTooltipProps } from '@pong/design-system';
import type { WorkflowHistoryVersionStatus } from '../types';
import { usePublishedByDetails } from './usePublishedByDetails';

defineSlots<{
	default: () => unknown;
}>();

const props = withDefaults(
	defineProps<{
		label: string;
		publishInfo?: {
			publishedAt: string;
			publishedBy: string | null;
		};
		secondaryText?: string;
		status?: WorkflowHistoryVersionStatus;
		placement?: PongTooltipProps['placement'];
		offset?: number;
	}>(),
	{
		publishInfo: undefined,
		secondaryText: undefined,
		status: 'default',
		placement: 'left',
		offset: 8,
	},
);

const i18n = useI18n();

const publishedByDetails = usePublishedByDetails(toRef(props, 'publishInfo'));
</script>

<template>
	<PongTooltip
		:placement="props.placement"
		:show-after="300"
		:offset="props.offset"
		:content-class="$style.tooltipContent"
	>
		<template #content>
			<div :class="$style.tooltipContentTitle">
				<WorkflowVersionStatusIndicator :status="props.status" />
				<PongText size="small" :bold="true">
					{{ props.label }}
					<template v-if="props.status === 'published'">
						({{ i18n.baseText('workflows.published') }})
					</template>
				</PongText>
			</div>
			<PongText size="small" :class="$style.tooltipSecondaryText">
				{{ props.secondaryText ?? publishedByDetails }}
			</PongText>
		</template>
		<slot />
	</PongTooltip>
</template>

<style module lang="scss">
.tooltipContentTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.tooltipSecondaryText {
	color: var(--color--text--tint-2);
	display: block;
	// This padding is to align the secondary text with the title text (to cover for the status dot space)
	padding-left: calc(var(--spacing--3xs) + var(--spacing--2xs));
}

.tooltipContent {
	max-width: 320px;
}
</style>
