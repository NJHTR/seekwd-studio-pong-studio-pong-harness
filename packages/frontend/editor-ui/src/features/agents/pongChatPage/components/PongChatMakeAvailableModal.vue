<script setup lang="ts">
import { computed, ref } from 'vue';
import { PONG_CHAT_INTEGRATION_TYPE, type AgentChatListItem } from '@pong/api-types';
import { PongButton, PongCallout, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import { useRootStore } from '@pong/stores/useRootStore';

import AgentModal from '../../components/modals/AgentModal.vue';
import { connectIntegration, publishAgent } from '../../composables/useAgentApi';
import { useAgentProjectBreadcrumb } from '../../composables/useAgentProjectBreadcrumb';
import { upsertProjectAgentsListCache } from '../../composables/useProjectAgentsList';

const props = defineProps<{
	agent: AgentChatListItem;
}>();

const emit = defineEmits<{
	close: [];
	available: [agent: AgentChatListItem];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const { projectName } = useAgentProjectBreadcrumb(computed(() => props.agent.project.id));

const submitting = ref(false);

async function onConfirm(): Promise<void> {
	if (submitting.value) return;
	const agent = props.agent;
	submitting.value = true;
	try {
		const { project, id } = agent;
		await connectIntegration(
			rootStore.restApiContext,
			project.id,
			id,
			PONG_CHAT_INTEGRATION_TYPE,
			'',
		);
		const published = await publishAgent(rootStore.restApiContext, project.id, id);
		upsertProjectAgentsListCache(project.id, published);
		emit('available', { ...agent, availableInChat: true });
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.pongChatPage.makeAvailable.error'));
	} finally {
		submitting.value = false;
	}
}

function onOpenChange(open: boolean): void {
	if (!open) emit('close');
}
</script>

<template>
	<AgentModal
		:open="true"
		:title="
			i18n.baseText('agents.pongChatPage.makeAvailable.title', {
				interpolate: { name: agent.name },
			})
		"
		:busy="submitting"
		:show-cancel="false"
		size="medium"
		data-test-id="pong-chat-make-available-modal"
		@update:open="onOpenChange"
	>
		<div :class="$style.content">
			<PongText>
				{{
					i18n.baseText('agents.pongChatPage.makeAvailable.description', {
						interpolate: { projectName: projectName ?? agent.project.name },
					})
				}}
			</PongText>
			<PongCallout theme="info">
				{{ i18n.baseText('agents.pongChatPage.makeAvailable.publishNotice') }}
			</PongCallout>
		</div>
		<template #footerActions>
			<PongButton variant="outline" :disabled="submitting" @click="emit('close')">
				{{ i18n.baseText('generic.cancel') }}
			</PongButton>
			<PongButton
				:loading="submitting"
				data-test-id="pong-chat-make-available-confirm"
				@click="onConfirm"
			>
				{{ i18n.baseText('agents.pongChatPage.makeAvailable.confirm') }}
			</PongButton>
		</template>
	</AgentModal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
