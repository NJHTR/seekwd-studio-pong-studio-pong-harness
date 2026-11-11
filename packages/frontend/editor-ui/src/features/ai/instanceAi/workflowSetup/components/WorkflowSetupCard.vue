<script lang="ts" setup>
import { computed } from 'vue';
import { PongCard, PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { WorkflowSetupSection } from '../workflowSetup.types';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import WorkflowSetupSectionBody from './WorkflowSetupSectionBody.vue';

const props = defineProps<{
	section: WorkflowSetupSection;
}>();

const ctx = useWorkflowSetupContext();
const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();

const credentialType = computed(() => props.section.credentialType);

const isComplete = computed(() => ctx.isSectionComplete(props.section));
const isSkipped = computed(() => ctx.isSectionSkipped(props.section));

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.section.node.type, props.section.node.typeVersion),
);

const isCredentialOnlySection = computed(
	() => !!credentialType.value && props.section.parameterNames.length === 0,
);

const displayName = computed(() => {
	const credentialTypeName = credentialType.value;
	if (!isCredentialOnlySection.value || !credentialTypeName) {
		return i18n.baseText('instanceAi.workflowSetup.configureNode', {
			interpolate: { name: props.section.node.name },
		});
	}
	// An agent-supplied recipe names the credential after the service ("fal.ai
	// API Key") — a friendlier title than the generic type ("Header Auth"). It's
	// already human-authored, so it skips the type-name keyword filtering.
	const hintName = props.section.setupHint?.suggestedName;
	const name =
		hintName ??
		getAppNameFromCredType(
			credentialsStore.getCredentialTypeByName(credentialTypeName)?.displayName ??
				credentialTypeName,
		);
	return i18n.baseText('instanceAi.credential.setupTitle', { interpolate: { name } });
});
</script>

<template>
	<PongCard :class="$style.card" data-test-id="instance-ai-workflow-setup-card">
		<div :class="$style.layout">
			<header :class="$style.header">
				<CredentialIcon
					v-if="isCredentialOnlySection"
					:credential-type-name="credentialType ?? null"
					:size="16"
				/>
				<NodeIcon v-else :node-type="nodeType" :size="16" />
				<PongText :class="$style.title" size="medium" color="text-dark" bold>
					{{ displayName }}
				</PongText>
				<PongText
					v-if="isComplete"
					data-test-id="instance-ai-workflow-setup-card-check"
					:class="$style.statusLabel"
					size="medium"
					color="success"
				>
					<PongIcon icon="check" size="large" />
					{{ i18n.baseText('generic.complete') }}
				</PongText>
				<PongText
					v-else-if="isSkipped"
					data-test-id="instance-ai-workflow-setup-card-skipped"
					:class="$style.statusLabel"
					size="medium"
					color="text-light"
				>
					<PongIcon icon="arrow-right" size="large" />
					{{ i18n.baseText('instanceAi.workflowSetup.cardSkipped') }}
				</PongText>
			</header>

			<div :class="$style.bodyWrapper">
				<WorkflowSetupSectionBody :section="section" />
			</div>

			<slot name="footer" />
		</div>
	</PongCard>
</template>

<style lang="scss" module>
.card {
	padding: var(--spacing--sm) 0 0;
	border: 0;
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--sm), var(--shadow--outline);
}

.layout {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm);
}

.title {
	flex: 1;
}

.statusLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.bodyWrapper {
	padding: 0 var(--spacing--sm);
}
</style>
