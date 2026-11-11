<script setup lang="ts">
import type { AgentSessionFile } from '@pong/api-types';
import { PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

defineProps<{
	files: AgentSessionFile[];
	fileHref: (fileId: string) => string;
	loading?: boolean;
	error?: boolean;
}>();

const i18n = useI18n();

function formatDate(createdAt: string) {
	const { date, time } = convertToDisplayDate(createdAt);
	return `${date} ${time}`;
}

/** A sandbox file name is a path in outputs/. The browser saves the base name. */
function baseName(fileName: string) {
	return fileName.slice(fileName.lastIndexOf('/') + 1);
}
</script>

<template>
	<section :class="$style.list" data-test-id="session-files-list">
		<PongText tag="h3" size="small" bold color="text-light">
			{{ i18n.baseText('agents.chat.sessionFiles.title') }}
		</PongText>
		<PongText v-if="error" size="small" color="danger" data-test-id="session-files-error">
			{{ i18n.baseText('agents.chat.sessionFiles.loadFailed') }}
		</PongText>
		<PongText
			v-else-if="loading && files.length === 0"
			size="small"
			color="text-light"
			data-test-id="session-files-loading"
		>
			{{ i18n.baseText('agents.chat.sessionFiles.loading') }}
		</PongText>
		<PongText
			v-else-if="files.length === 0"
			size="small"
			color="text-light"
			data-test-id="session-files-empty"
		>
			{{ i18n.baseText('agents.chat.sessionFiles.empty') }}
		</PongText>
		<ul v-else :class="$style.items">
			<li v-for="file in files" :key="file.fileId" :class="$style.item">
				<PongIcon icon="file" size="small" :class="$style.icon" />
				<a
					:href="fileHref(file.fileId)"
					:download="baseName(file.fileName)"
					:title="file.fileName"
					:class="$style.name"
					data-test-id="session-file-link"
				>
					{{ file.fileName }}
				</a>
				<PongText size="xsmall" color="text-light" :class="$style.date">
					{{ formatDate(file.createdAt) }}
				</PongText>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	// Viewport-relative, so a long list leaves room for the chat. No token exists for this.
	max-height: 40vh;
	overflow-y: auto;
}

.items {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	font-size: var(--font-size--sm);
}

.icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color--text);
}

.date {
	flex-shrink: 0;
}
</style>
