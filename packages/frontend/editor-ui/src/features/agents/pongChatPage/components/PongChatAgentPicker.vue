<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { AgentChatListItem } from '@pong/api-types';
import {
	PongButton,
	PongDropdownMenu,
	PongIcon,
	PongText,
	type DropdownMenuItemProps,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { I18nT } from 'vue-i18n';
import { getDebounceTime } from '@pong/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';
import { AGENT_PONG_CHAT_LIBRARY_VIEW } from '../../constants';
import { usePongChatAgents } from '../composables/usePongChatAgents';
import { usePongAssistantIdentity } from '../composables/usePongAssistantIdentity';
import { useAgentTelemetry } from '../../composables/useAgentTelemetry';
import { useAgentPermissions } from '../../composables/useAgentPermissions';
import { useCreateAgent } from '../../composables/useCreateAgent';
import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';
import PongChatMakeAvailableModal from './PongChatMakeAvailableModal.vue';

/** Non-agent id for the "pong Assistant" row, which has no agent id of its own. */
const ASSISTANT_ITEM_ID = '__pong_assistant__';
const PAGE_SIZE = 10;

type PickerItemData = { kind: 'assistant' } | { kind: 'agent'; agent: AgentChatListItem };

const props = defineProps<{
	/** `null` selects pong Assistant. */
	modelValue: AgentChatListItem | null;
	projectId?: string;
	/** Blocks picking a different recipient, e.g. while a send is being prepared. */
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [agent: AgentChatListItem | null];
}>();

const i18n = useI18n();
const router = useRouter();
const agentTelemetry = useAgentTelemetry();
const { canCreate } = useAgentPermissions(() => props.projectId);
const { createAgent } = useCreateAgent();

const searchQuery = ref('');
const { agents, count, isLoading, retry } = usePongChatAgents({
	query: searchQuery,
	page: 1,
	pageSize: PAGE_SIZE,
});

const { name: assistantName, description: assistantDescription } = usePongAssistantIdentity();

// The dropdown's internal search mode manages the search text and keyboard
// navigation but renders no filtering of its own (DropdownMenuSearchableContent
// only emits `search`) — the Assistant row's visibility is filtered here.
const showAssistantItem = computed(() => {
	const query = searchQuery.value.trim().toLowerCase();
	return query.length === 0 || assistantName.value.toLowerCase().includes(query);
});

const items = computed<Array<DropdownMenuItemProps<string, PickerItemData>>>(() => {
	const agentItems = agents.value.map((agent) => ({
		id: agent.id,
		testId: `pong-chat-agent-picker-item-${agent.id}`,
		label: agent.name,
		data: { kind: 'agent' as const, agent },
	}));
	if (!showAssistantItem.value) return agentItems;
	return [
		{
			id: ASSISTANT_ITEM_ID,
			testId: 'pong-chat-agent-picker-item-assistant',
			label: assistantName.value,
			data: { kind: 'assistant' as const },
		},
		...agentItems,
	];
});

function isUnavailable(data?: PickerItemData): boolean {
	return data?.kind === 'agent' && !data.agent.availableInChat;
}

function itemDescription(data?: PickerItemData): string | undefined {
	if (!data) return undefined;
	return data.kind === 'assistant' ? assistantDescription.value : data.agent.description;
}

const showViewAll = computed(() => count.value > PAGE_SIZE);
const canCreateInProject = computed(() => Boolean(props.projectId) && canCreate.value);
const showFooter = computed(() => showViewAll.value || canCreateInProject.value);

const selectedName = computed(() => props.modelValue?.name ?? assistantName.value);
const selectedDescription = computed(() =>
	props.modelValue ? props.modelValue.description : assistantDescription.value,
);

function handleSearch(term: string) {
	searchQuery.value = term;
}

function handleSelect(id: string) {
	if (id === ASSISTANT_ITEM_ID) {
		emit('update:modelValue', null);
		return;
	}
	const agent = agents.value.find((candidate) => candidate.id === id);
	if (!agent) return;
	if (!agent.availableInChat) {
		agentToMakeAvailable.value = agent;
		return;
	}
	selectAgent(agent);
}

function selectAgent(agent: AgentChatListItem) {
	emit('update:modelValue', agent);
	agentTelemetry.trackSelectedPongChatAgent({ agentId: agent.id, source: 'dropdown' });
}

const agentToMakeAvailable = ref<AgentChatListItem | null>(null);

function onAgentAvailable(agent: AgentChatListItem) {
	agentToMakeAvailable.value = null;
	retry();
	selectAgent(agent);
}

function goToLibrary() {
	void router.push({ name: AGENT_PONG_CHAT_LIBRARY_VIEW });
}

function handleCreateAgent() {
	if (!props.projectId) return;
	createAgent('dropdown', props.projectId);
}
</script>

<template>
	<div :class="$style.container" data-test-id="pong-chat-agent-picker">
		<PongText
			tag="h1"
			size="xlarge"
			bold
			:class="$style.heading"
			data-test-id="pong-chat-agent-picker-heading"
		>
			<I18nT keypath="agents.pongChatPage.picker.chatWith" scope="global">
				<template #agent>
					<PongDropdownMenu
						:items="items"
						:loading="isLoading"
						:disabled="disabled"
						searchable
						:search-placeholder="i18n.baseText('agents.pongChatPage.library.search.placeholder')"
						:search-debounce="getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH)"
						:empty-text="i18n.baseText('agents.pongChatPage.library.empty.noResults.title')"
						placement="bottom-start"
						max-height="50vh"
						content-test-id="pong-chat-agent-picker-menu"
						@search="handleSearch"
						@select="handleSelect"
					>
						<template #trigger>
							<button
								type="button"
								:class="$style.trigger"
								:disabled="disabled"
								data-test-id="pong-chat-agent-picker-trigger"
							>
								<PongIcon v-if="!modelValue" icon="pong-assistant" :size="18" />
								<AgentPersonalisationIcon
									v-else
									:personalisation="modelValue.personalisation"
									:size="24"
								/>
								<span :class="$style.triggerName">{{ selectedName }}</span>
								<PongIcon icon="chevron-down" size="small" color="text-light" />
							</button>
						</template>

						<template #item-leading="{ item, ui }">
							<span
								:class="[
									ui.class,
									$style.itemAvatar,
									{ [$style.unavailable]: isUnavailable(item.data) },
								]"
							>
								<PongIcon v-if="item.data?.kind === 'assistant'" icon="pong-assistant" :size="18" />
								<AgentPersonalisationIcon
									v-else
									:personalisation="
										item.data?.kind === 'agent' ? item.data.agent.personalisation : null
									"
									:size="24"
								/>
							</span>
						</template>

						<template #item-label="{ item }">
							<div :class="[$style.itemLabel, { [$style.unavailable]: isUnavailable(item.data) }]">
								<PongText bold>{{ item.label }}</PongText>
								<PongText
									v-if="itemDescription(item.data)"
									size="small"
									color="text-light"
									:class="$style.itemDescription"
								>
									{{ itemDescription(item.data) }}
								</PongText>
							</div>
						</template>

						<template #item-trailing="{ item, ui }">
							<PongText
								v-if="isUnavailable(item.data)"
								size="small"
								bold
								:class="[ui.class, $style.makeAvailable]"
								:data-test-id="`pong-chat-agent-picker-make-available-${item.id}`"
							>
								{{ i18n.baseText('agents.pongChatPage.makeAvailable.action') }}
							</PongText>
						</template>

						<template v-if="showFooter" #footer>
							<div :class="$style.footer">
								<PongButton
									v-if="showViewAll"
									variant="ghost"
									:class="$style.footerButton"
									data-test-id="pong-chat-agent-picker-view-all"
									@click="goToLibrary"
								>
									{{ i18n.baseText('agents.pongChatPage.viewAllAgents') }}
									<PongIcon icon="chevron-right" size="small" />
								</PongButton>
								<PongButton
									v-if="canCreateInProject"
									variant="ghost"
									:class="$style.footerButton"
									icon="plus"
									data-test-id="pong-chat-agent-picker-create"
									@click="handleCreateAgent"
								>
									{{ i18n.baseText('agents.pongChatPage.picker.createNewAgent') }}
									<!-- Opens the agent builder, a new page. -->
									<PongIcon icon="external-link" size="small" />
								</PongButton>
							</div>
						</template>
					</PongDropdownMenu>
				</template>
			</I18nT>
		</PongText>
		<PongText
			v-if="selectedDescription"
			tag="p"
			color="text-light"
			:class="$style.subtitle"
			data-test-id="pong-chat-agent-picker-subtitle"
		>
			{{ selectedDescription }}
		</PongText>
		<PongChatMakeAvailableModal
			v-if="agentToMakeAvailable"
			:agent="agentToMakeAvailable"
			@close="agentToMakeAvailable = null"
			@available="onAgentAvailable"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	text-align: center;
}

.heading {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--2xs);
}

.trigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0;
	font: inherit;
	font-weight: inherit;
	color: inherit;
	background: none;
	border: none;
	cursor: pointer;

	&:disabled {
		cursor: not-allowed;
	}
}

.triggerName {
	text-decoration: underline dotted;
	text-underline-offset: var(--spacing--5xs);
}

.subtitle {
	max-width: 480px;
}

// Top-aligned next to a two-line label, not centered.
.itemAvatar {
	align-self: flex-start;
	display: inline-flex;
}

.itemLabel {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: var(--line-height--sm);
}

.unavailable {
	opacity: 0.5;
}

.makeAvailable {
	align-self: flex-start;
	white-space: nowrap;
	color: var(--text-color);
}

.itemDescription {
	line-height: var(--line-height--sm);
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

// Same footer as the "Chat history" dropdown: a divider, then full-width actions that
// start at the rows' left edge.
.footer {
	display: flex;
	flex-direction: column;
	border-top: var(--border);
	padding: var(--spacing--4xs);
}

.footerButton {
	width: 100%;
	justify-content: flex-start;
}
</style>
