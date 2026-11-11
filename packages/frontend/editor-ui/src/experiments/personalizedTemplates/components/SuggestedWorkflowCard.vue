<script setup lang="ts">
import { usePersonalizedTemplatesStore } from '@/experiments/personalizedTemplates/stores/personalizedTemplates.store';
import { useI18n } from '@pong/i18n';
import { PongCallout, PongIcon, PongLink } from '@pong/design-system';

type SuggestedWorkflow = {
	id: number;
	name: string;
};

const props = defineProps<{
	data: SuggestedWorkflow;
}>();
const { data } = props;

const {
	dismissSuggestedWorkflow,
	getTemplateRoute,
	trackUserClickedOnPersonalizedTemplate,
	trackUserDismissedCallout,
} = usePersonalizedTemplatesStore();
const locale = useI18n();

const onDismissCallout = () => {
	trackUserDismissedCallout(data.id);
	dismissSuggestedWorkflow(data.id);
};

const onTryTemplate = () => {
	trackUserClickedOnPersonalizedTemplate(data.id);
	dismissSuggestedWorkflow(data.id);
};
</script>

<template>
	<PongCallout
		theme="secondary"
		:iconless="true"
		:class="$style['suggested-workflow-callout']"
		:slim="true"
	>
		<div :class="$style['callout-content']">
			{{ data.name }}
		</div>
		<template #trailingContent>
			<div :class="$style['callout-trailing-content']">
				<PongLink
					data-test-id="suggested-workflow-button"
					size="small"
					:to="getTemplateRoute(data.id)"
					@click="onTryTemplate"
				>
					{{ locale.baseText('workflows.itemSuggestion.try') }}
				</PongLink>
				<PongIcon
					size="small"
					icon="x"
					:title="locale.baseText('generic.dismiss')"
					class="clickable"
					@click="onDismissCallout"
				/>
			</div>
		</template>
	</PongCallout>
</template>

<style lang="scss" module>
.suggested-workflow-callout {
	margin-top: var(--spacing--xs);
	padding-left: var(--spacing--sm);
	padding-right: var(--spacing--md);
	border-style: dashed;

	.callout-content {
		display: flex;
		flex-direction: column;
	}

	.callout-trailing-content {
		display: flex;
		align-items: center;
		gap: var(--spacing--md);
	}

	a {
		span {
			span {
				color: var(--callout--color--text--secondary);
			}
		}
	}
}
</style>
