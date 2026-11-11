<script setup lang="ts">
import { AGENT_DESCRIPTION_MAX_LENGTH } from '@pong/api-types';
import { PongCallout, PongInput, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, ref } from 'vue';
import { I18nT } from 'vue-i18n';

import { useAgentProjectBreadcrumb } from '../../composables/useAgentProjectBreadcrumb';
import type { AgentChannelViewProps } from '../types';

const props = defineProps<AgentChannelViewProps & { savedDescription?: string }>();

const i18n = useI18n();
const { projectName } = useAgentProjectBreadcrumb(computed(() => props.projectId));

const description = ref(props.savedDescription ?? '');

defineExpose({ description });
</script>

<template>
	<div :class="$style.editView">
		<PongCallout theme="info">
			<I18nT keypath="agents.channels.pongChat.callout" scope="global">
				<template #projectName
					><strong>{{ projectName }}</strong></template
				>
			</I18nT>
		</PongCallout>
		<div :class="$style.descriptionBlock">
			<div :class="$style.labelRow">
				<PongText bold size="medium" color="text-dark">
					{{ i18n.baseText('agents.channels.pongChat.description.label') }}
				</PongText>
				<PongText size="small" color="text-light">
					{{ i18n.baseText('agents.channels.pongChat.description.optional') }}
				</PongText>
			</div>
			<PongText size="small" color="text-light">
				{{ i18n.baseText('agents.channels.pongChat.description.hint') }}
			</PongText>
			<PongInput
				v-model="description"
				type="textarea"
				:rows="3"
				:maxlength="AGENT_DESCRIPTION_MAX_LENGTH"
				:placeholder="i18n.baseText('agents.channels.pongChat.description.placeholder')"
				data-testid="agent-channel-pong-chat-description"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.descriptionBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.labelRow {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
}
</style>
