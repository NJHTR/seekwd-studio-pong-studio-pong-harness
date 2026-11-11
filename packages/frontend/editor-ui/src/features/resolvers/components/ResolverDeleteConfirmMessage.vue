<script lang="ts" setup>
import type { CredentialResolverAffectedWorkflow } from '@pong/api-types';
import { PongLink, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';

const MAX_DISPLAYED_WORKFLOWS = 5;

const props = defineProps<{
	resolverName: string;
	affectedWorkflows: CredentialResolverAffectedWorkflow[];
}>();

const i18n = useI18n();
const router = useRouter();

const displayed = computed(() => props.affectedWorkflows.slice(0, MAX_DISPLAYED_WORKFLOWS));
const remaining = computed(() => props.affectedWorkflows.length - displayed.value.length);

const messageKey = computed(() =>
	props.affectedWorkflows.length > 0
		? 'credentialResolverEdit.confirmMessage.deleteResolver.messageWithWorkflows'
		: 'credentialResolverEdit.confirmMessage.deleteResolver.message',
);

const messageParts = computed(() => {
	const full = i18n.baseText(messageKey.value, {
		interpolate: { savedResolverName: '{{RESOLVER_NAME}}' },
	});
	const [before, after] = full.split('{{RESOLVER_NAME}}');
	return { before, after };
});
</script>

<template>
	<div :class="$style.container">
		<PongText>
			{{ messageParts.before }}<PongText bold tag="span">{{ props.resolverName }}</PongText
			>{{ messageParts.after }}
		</PongText>
		<ul v-if="affectedWorkflows.length > 0" :class="$style.workflowList">
			<li v-for="workflow in displayed" :key="workflow.id" :class="$style.workflowItem">
				<PongLink
					:href="router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: workflow.id } }).href"
					new-window
				>
					{{ workflow.name }}
				</PongLink>
			</li>
		</ul>
		<PongText v-if="remaining > 0" size="small" color="text-light">
			{{
				i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.andMore', {
					interpolate: { count: String(remaining) },
				})
			}}
		</PongText>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.workflowList {
	margin: 0;
	padding-left: var(--spacing--md);
	list-style: disc;
}

.workflowItem {
	padding: var(--spacing--4xs) 0;
}
</style>
