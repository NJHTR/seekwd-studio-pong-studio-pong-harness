<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	PongActionDropdown,
	PongButton,
	PongHeading,
	PongIcon,
	PongIconButton,
	PongInput,
	PongText,
} from '@pong/design-system';
import type { ActionDropdownItem } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { formatTimeAgo } from '@/app/utils/formatters/dateFormatter';
import { useAgentsPongChatFlag } from '@/features/agents/composables/useAgentsPongChatFlag';
import RecentChatIcon from '@/features/agents/pongChatPage/components/RecentChatIcon.vue';
import { useAgentPongChatThreadsStore } from '@/features/agents/pongChatPage/pongChatThreads.store';
import { useMergedChatHistory } from '@/features/agents/pongChatPage/useMergedChatHistory';
import {
	agentThreadActions,
	chatItemRoute,
	chatItemTitle,
	isAssistantChatItem,
	type RecentChatItem,
} from '@/features/agents/pongChatPage/mergeRecentChats';
import { clearPendingThreadHandoff } from './composables/useInstanceAiHandoff';
import { INSTANCE_AI_VIEW } from './constants';
import { useInstanceAiStore } from './instanceAi.store';
import { useAssistantAgentThreadsStore } from './assistantAgent/assistantAgentThreads.store';

const store = useInstanceAiStore();
const agentThreadsStore = useAgentPongChatThreadsStore();
const assistantAgentThreadsStore = useAssistantAgentThreadsStore();
const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const isAgentsPongChatFlag = useAgentsPongChatFlag();

useDocumentTitle().set(i18n.baseText('instanceAi.sidebar.chatHistory'));

const {
	items: mergedThreads,
	hasMore,
	history,
	isLoading,
	error,
	search,
	listRef,
	sentinelRef,
	loadMore,
} = useMergedChatHistory();
const editingThreadId = ref<string | null>(null);
const editingTitle = ref('');
const renameInput = ref<HTMLInputElement | null>(null);

const threadActions: Array<ActionDropdownItem<'rename' | 'delete'>> = [
	{ id: 'rename', label: i18n.baseText('instanceAi.sidebar.renameThread'), icon: 'pencil' },
	{ id: 'delete', label: i18n.baseText('instanceAi.sidebar.deleteThread'), icon: 'trash-2' },
];

const agentActions = agentThreadActions(i18n);

function itemTitle(item: RecentChatItem): string {
	return chatItemTitle(item, i18n);
}

const itemRoute = chatItemRoute;

/** An pong Assistant thread on either runtime. pong Chat agent threads have no rename. */
type AssistantChatItem = Extract<RecentChatItem, { kind: 'assistant' | 'assistant-agent' }>;

function startRename({ thread }: AssistantChatItem) {
	editingThreadId.value = thread.id;
	editingTitle.value = thread.title ?? '';
	// Focus once here: a function ref runs on every render and re-selects the text on each key.
	void nextTick(() => {
		renameInput.value?.focus();
		renameInput.value?.select();
	});
}

function setRenameInput(element: unknown) {
	renameInput.value = element instanceof HTMLInputElement ? element : null;
}

async function confirmRename(item: AssistantChatItem) {
	const { thread } = item;
	// Enter removes the input, which can also fire blur. Rename once.
	if (editingThreadId.value !== thread.id) return;
	editingThreadId.value = null;
	const title = editingTitle.value.trim();
	if (!title || title === thread.title) return;
	try {
		if (item.kind === 'assistant') await store.renameThread(thread.id, title);
		else await assistantAgentThreadsStore.renameThread(thread.id, title);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('instanceAi.threads.renameSuccess'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.threads.renameError'));
	}
}

async function handleThreadAction(action: string, item: AssistantChatItem) {
	if (action === 'rename') startRename(item);
	if (action !== 'delete') return;
	if (item.kind === 'assistant-agent') {
		await assistantAgentThreadsStore.deleteThread(item.thread);
	} else if (await store.deleteThread(item.thread.id)) {
		clearPendingThreadHandoff(item.thread.id);
	}
}

/** The delete-only menu of pong Chat agent threads. */
async function handleAgentThreadAction(
	action: string,
	item: Extract<RecentChatItem, { kind: 'agent' }>,
) {
	if (action === 'delete') await agentThreadsStore.deleteThread(item.thread);
}
</script>

<template>
	<PageViewLayout full-width data-test-id="instance-ai-threads-view">
		<div :class="$style.page">
			<div :class="$style.header">
				<PongIconButton
					icon="arrow-left"
					variant="ghost"
					:aria-label="i18n.baseText('instanceAi.threads.backToAssistant')"
					@click="router.push({ name: INSTANCE_AI_VIEW })"
				/>
				<PongHeading :class="$style.heading" tag="h1" size="xlarge" bold>
					{{ i18n.baseText('instanceAi.sidebar.chatHistory') }}
				</PongHeading>
				<PongInput
					v-model="search"
					:class="$style.search"
					size="small"
					clearable
					:maxlength="500"
					:placeholder="i18n.baseText('instanceAi.threads.searchPlaceholder')"
					data-test-id="instance-ai-threads-search"
				>
					<template #prefix>
						<PongIcon icon="search" size="small" />
					</template>
				</PongInput>
				<PongButton size="small" icon="plus" @click="router.push({ name: INSTANCE_AI_VIEW })">
					{{ i18n.baseText('instanceAi.thread.new') }}
				</PongButton>
			</div>

			<div ref="listRef" :class="$style.list">
				<div
					v-for="item in mergedThreads"
					:key="item.thread.id"
					:class="$style.row"
					data-test-id="instance-ai-history-thread"
				>
					<input
						v-if="isAssistantChatItem(item) && editingThreadId === item.thread.id"
						:ref="setRenameInput"
						v-model="editingTitle"
						:class="$style.renameInput"
						type="text"
						maxlength="255"
						@keydown.enter="confirmRename(item)"
						@keydown.escape="editingThreadId = null"
						@blur="confirmRename(item)"
					/>
					<template v-else>
						<RouterLink
							:to="itemRoute(item)"
							:class="$style.link"
							:title="itemTitle(item)"
							@dblclick.prevent="isAssistantChatItem(item) && startRename(item)"
						>
							<template v-if="isAgentsPongChatFlag">
								<RecentChatIcon :class="$style.icon" :item="item" :size="20" />
							</template>
							<PongIcon v-else :class="$style.icon" icon="message-circle" size="medium" />
							<PongText :class="$style.title" size="medium">{{ itemTitle(item) }}</PongText>
						</RouterLink>
						<PongText size="small" color="text-light">{{
							formatTimeAgo(item.thread.updatedAt)
						}}</PongText>
						<PongActionDropdown
							v-if="isAssistantChatItem(item)"
							:items="threadActions"
							:class="$style.actions"
							placement="bottom-end"
							@select="handleThreadAction($event, item)"
						>
							<template #activator>
								<PongIconButton
									variant="ghost"
									icon="ellipsis"
									:aria-label="i18n.baseText('instanceAi.threads.actions')"
								/>
							</template>
						</PongActionDropdown>
						<PongActionDropdown
							v-else
							:items="agentActions"
							:class="$style.actions"
							placement="bottom-end"
							@select="handleAgentThreadAction($event, item)"
						>
							<template #activator>
								<PongIconButton
									variant="ghost"
									icon="ellipsis"
									:aria-label="i18n.baseText('instanceAi.threads.actions')"
								/>
							</template>
						</PongActionDropdown>
					</template>
				</div>

				<div v-if="isLoading" :class="$style.status" role="status">
					<PongText color="text-light">{{ i18n.baseText('instanceAi.threads.loading') }}</PongText>
				</div>
				<div v-else-if="error" :class="$style.status" role="alert">
					<PongText>{{ i18n.baseText('instanceAi.threads.loadError') }}</PongText>
					<PongButton
						variant="outline"
						size="small"
						data-test-id="instance-ai-threads-retry"
						@click="loadMore"
					>
						{{ i18n.baseText('generic.retry') }}
					</PongButton>
				</div>
				<div v-else-if="hasMore" ref="sentinelRef" :class="$style.sentinel" />
				<div v-else-if="mergedThreads.length === 0" :class="$style.status">
					<PongText color="text-light">
						{{
							i18n.baseText(
								history.search
									? 'instanceAi.threads.noSearchResults'
									: 'instanceAi.sidebar.noThreads',
							)
						}}
					</PongText>
				</div>
			</div>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	width: 100%;
	max-width: var(--content-container--width);
	margin: 0 auto;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-bottom: var(--spacing--sm);
}

.heading {
	flex: 1;
	min-width: 0;
}

.search {
	width: 240px;
}

.list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);

	&:hover,
	&:focus-within,
	&:has([aria-expanded='true']) {
		background-color: var(--color--background--light-1);

		.actions {
			opacity: 1;
		}
	}
}

.link {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
	color: var(--color--text) !important;
	text-decoration: none !important;
}

.icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	flex-shrink: 0;
	opacity: 0;

	// Touch devices have no hover: keep the menu button visible.
	@media (hover: none) {
		opacity: 1;
	}
}

.renameInput {
	flex: 1;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
	background: var(--color--background--light-2);
	border: var(--border);
	border-color: var(--color--primary);
	border-radius: var(--radius);
	outline: none;
}

.status {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
}

.sentinel {
	height: 1px;
}
</style>
