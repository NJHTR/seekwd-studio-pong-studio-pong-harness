<script setup lang="ts">
import { PongButton, PongText } from '@pong/design-system';
import { componentRegistry } from '@pong/frontend-module-sdk';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

import type { WorkflowShellStatus } from '../../promotionPreview.workflow';
import PromotionWorkflowSideLabel from './PromotionWorkflowSideLabel.vue';

defineProps<{
	status: WorkflowShellStatus;
	workflowName: string;
}>();
const emit = defineEmits<{ activate: []; retry: []; refresh: [] }>();
const i18n = useI18n();
const WorkflowDiffPlaceholder = computed(() => componentRegistry.get('workflow-diff-placeholder'));
</script>

<template>
	<!-- The real diff follows a loading state, so the illustration would only flash. -->
	<component
		:is="WorkflowDiffPlaceholder"
		v-if="WorkflowDiffPlaceholder"
		:hide-illustration="status === 'loading'"
	>
		<template #sourceLabel>
			<PromotionWorkflowSideLabel side="before" />
		</template>
		<template #targetLabel>
			<PromotionWorkflowSideLabel side="after" />
		</template>
		<PongButton
			v-if="status === 'idle'"
			variant="outline"
			size="xlarge"
			:aria-label="
				i18n.baseText('promotions.preview.workflow.showDiffOf', {
					interpolate: { name: workflowName },
				})
			"
			@click="emit('activate')"
		>
			{{ i18n.baseText('promotions.preview.workflow.showDiff') }}
		</PongButton>
		<PongButton v-else-if="status === 'loading'" variant="outline" loading disabled>
			{{ i18n.baseText('promotions.preview.workflow.loadingDiff') }}
		</PongButton>
		<template v-else-if="status === 'error'">
			<PongText color="text-light">{{
				i18n.baseText('promotions.preview.card.loadFailed')
			}}</PongText>
			<PongButton variant="outline" @click="emit('retry')">
				{{ i18n.baseText('promotions.preview.state.retry') }}
			</PongButton>
		</template>
		<template v-else-if="status === 'missing'">
			<PongText color="text-light">{{ i18n.baseText('promotions.preview.card.missing') }}</PongText>
			<PongButton variant="outline" @click="emit('refresh')">
				{{ i18n.baseText('promotions.preview.refresh') }}
			</PongButton>
		</template>
		<PongText v-else color="text-light">
			{{ i18n.baseText('promotions.preview.card.unreadable') }}
		</PongText>
	</component>
</template>
