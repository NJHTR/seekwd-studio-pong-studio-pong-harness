<script setup lang="ts">
import type { useArtifactLinks } from '@/features/ai/instanceAi/artifactLinks';
import { PongCodeBlock, PongMarkdown } from '@pong/design-system';
import ChatResourceLink from './ChatResourceLink.vue';
import { computed } from 'vue';
import type { PluginSimple } from 'markdown-it';
import { decorateResourceNames, type ChatResource } from './ChatMarkdown.utils';
import type { AgentTestTarget } from '@/features/agents/utils/agentTestUrl';
import { useChatMarkdownOptions, type ChatMarkdownOptions } from './useChatMarkdownOptions';

const props = withDefaults(
	defineProps<{
		content: string;
		options?: ChatMarkdownOptions;
		singlePre?: boolean;
		plugins?: PluginSimple[];
		streaming?: boolean;
		filterInternalBlocks?: boolean;
		resources?: readonly ChatResource[];
		linkableResources?: readonly ChatResource[];
		agentPreviewTarget?: AgentTestTarget;
		openWorkflowPreview?: (id: string) => boolean;
		openDataTablePreview?: (id: string, projectId: string) => boolean;
		openAgentPreview?: (id: string, projectId: string) => boolean;
		openAgentChatPreview?: (id: string, projectId: string) => boolean;
		openSkillPreview?: (id: string) => boolean;
		openAppPreview?: (id: string) => boolean;
		artifactLinks?: Pick<
			ReturnType<typeof useArtifactLinks>,
			'artifactHref' | 'routerPathHref' | 'toRouterPath'
		>;
	}>(),
	{ options: () => ({}), singlePre: false },
);
const processedContent = computed(() => {
	const content = props.filterInternalBlocks
		? props.content
				.replace(
					/<(planning-blueprint|planned-task-follow-up|background-task-completed|running-tasks)\b[^>]*>[\s\S]*?<\/\1>/g,
					'',
				)
				.trim()
		: props.content;
	return props.streaming ? content : decorateResourceNames(content, props.linkableResources ?? []);
});
const markdown = useChatMarkdownOptions(() => props.options);
</script>

<template>
	<PongMarkdown
		:content="processedContent"
		class="pong-markdown"
		:class="{ 'pong-markdown--single-pre': props.singlePre }"
		:options="markdown.options"
		:plugins="[...markdown.plugins.value, ...(props.plugins ?? [])]"
	>
		<template #link="link">
			<ChatResourceLink
				v-bind="link"
				:resources="props.resources"
				:agent-preview-target="props.agentPreviewTarget"
				:open-workflow-preview="props.openWorkflowPreview"
				:open-data-table-preview="props.openDataTablePreview"
				:open-agent-preview="props.openAgentPreview"
				:open-agent-chat-preview="props.openAgentChatPreview"
				:open-skill-preview="props.openSkillPreview"
				:open-app-preview="props.openAppPreview"
				:artifact-links="props.artifactLinks"
			/>
		</template>
		<template #code-block="{ code, language }">
			<PongCodeBlock :code="code" :language="language || 'auto'" />
		</template>
	</PongMarkdown>
</template>

<style lang="scss">
@use '@pong/design-system/css/markdown.scss';
</style>

<style scoped>
.pong-markdown :deep(.pong-markdown-footnote-block) {
	display: none;
}
</style>
