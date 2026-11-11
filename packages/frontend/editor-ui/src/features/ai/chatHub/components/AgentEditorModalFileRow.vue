<script setup lang="ts">
import { computed } from 'vue';
import { PongIcon, PongIconButton, PongText, PongTooltip } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import dateformat from 'dateformat';
import type { ChatHubLLMProvider, ChatHubAgentKnowledgeItem } from '@pong/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';

export type FileRow = ChatHubAgentKnowledgeItem & { isNew: boolean };

const props = defineProps<{
	item: FileRow;
	semanticSearchReady: boolean;
	currentEmbeddingProvider: ChatHubLLMProvider | null;
}>();

const emit = defineEmits<{
	remove: [];
}>();

const i18n = useI18n();

const formattedCreatedAt = computed(() => {
	const createdAt = props.item.createdAt ?? new Date().toISOString();
	const currentYear = new Date().getFullYear().toString();
	const sameYear = createdAt.startsWith(currentYear);
	const date = dateformat(createdAt, `mmmm d${sameYear ? '' : ', yyyy'}`);
	return i18n.baseText('chatHub.agent.editor.files.createdAt', { interpolate: { date } });
});

const warningTooltip = computed<string | undefined>(() => {
	if (props.item.isNew || props.item.status !== 'indexed') return undefined;
	if (!props.semanticSearchReady) {
		return i18n.baseText('chatHub.agent.editor.files.semanticSearchNotReady.tooltip');
	}
	if (props.item.provider && props.item.provider !== props.currentEmbeddingProvider) {
		return i18n.baseText('chatHub.agent.editor.files.embeddingMismatch.tooltip', {
			interpolate: {
				fileProvider: providerDisplayNames[props.item.provider],
				currentProvider: props.currentEmbeddingProvider
					? providerDisplayNames[props.currentEmbeddingProvider]
					: 'unknown',
			},
		});
	}
	return undefined;
});
</script>

<template>
	<div :class="$style.fileRow">
		<div :class="$style.fileName">
			<span :class="$style.fileNameText">{{ item.fileName }}</span>
			<span :class="$style.createdAt">{{ formattedCreatedAt }}</span>
		</div>
		<div :class="$style.indexedCell">
			<PongTooltip v-if="warningTooltip" :content="warningTooltip">
				<PongText size="small" :class="$style.statusText">
					<PongIcon icon="triangle-alert" size="medium" :class="$style.iconWarning" />
					{{ i18n.baseText('chatHub.agent.editor.files.unavailable') }}
				</PongText>
			</PongTooltip>
			<template v-else-if="item.status === 'indexing'">
				<PongIcon icon="loader" :class="$style.iconIndexing" size="medium" />
				<PongText size="small" color="text-light">
					{{ i18n.baseText('chatHub.agent.editor.files.indexing') }}
				</PongText>
			</template>
			<template v-else-if="item.status === 'error'">
				<PongTooltip
					:content="
						i18n.baseText('chatHub.agent.editor.files.indexingError.tooltip', {
							interpolate: { error: item.error ?? 'Unknown error' },
						})
					"
				>
					<PongText size="small" color="danger" :class="$style.statusText">
						<PongIcon icon="circle-x" size="medium" />
						{{ i18n.baseText('chatHub.agent.editor.files.failed') }}
					</PongText>
				</PongTooltip>
			</template>
		</div>
		<PongIconButton
			v-if="item.status !== 'indexing'"
			icon="trash-2"
			size="small"
			variant="outline"
			@click.stop="emit('remove')"
		/>
	</div>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/motion';

.fileRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	background-color: var(--color--background--light-2);

	&:last-child {
		border-bottom: none;
	}
}

.fileName {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);

	.fileNameText {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--font-size--sm);
		line-height: var(--line-height--xl);
	}
}

.createdAt {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--lg);
}

.indexedCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.iconWarning {
	color: var(--color--warning);
}

.iconIndexing {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
	@include motion.spin;
}

.statusText {
	display: flex;
	gap: var(--spacing--4xs);
	align-items: center;
}
</style>
