<script setup lang="ts">
import { useMCPStore } from '../mcp.store';
import { LOADING_INDICATOR_TIMEOUT } from '../mcp.constants';
import { PongSelect, PongOption, PongText } from '@pong/design-system';
import { computed, onMounted, ref, useCssModule } from 'vue';
import type { McpAgent } from '../mcp.types';
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import { sleep } from '@pong/utils/sleep';

defineProps<{
	placeholder?: string;
	disabled?: boolean;
}>();

const i18n = useI18n();
const toast = useToast();

const modelValue = defineModel<string[]>({ default: () => [] });

const emit = defineEmits<{
	ready: [];
	confirm: [];
}>();

const mcpStore = useMCPStore();

const isLoading = ref(false);
const hasFetched = ref(false);
const isDropdownVisible = ref(false);
const selectRef = ref<InstanceType<typeof PongSelect>>();
const agentOptions = ref<McpAgent[]>([]);
let loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

const showEmptyState = computed(() => {
	return !isLoading.value && hasFetched.value && agentOptions.value.length === 0;
});

const $style = useCssModule();

// `popper-class` is a string prop, so the classes are joined here rather than
// passed as an object binding.
const popperClass = computed(() =>
	[
		isLoading.value ? $style['mcp-agents-select-loading'] : '',
		showEmptyState.value ? $style['mcp-agents-select-empty'] : '',
	]
		.filter(Boolean)
		.join(' '),
);

const projectName = (agent: McpAgent) =>
	agent.project?.type === 'personal'
		? i18n.baseText('projects.menu.personal')
		: (agent.project?.name ?? '');

async function searchAgents(query?: string) {
	if (loadingTimeoutId) {
		clearTimeout(loadingTimeoutId);
		loadingTimeoutId = null;
	}
	isLoading.value = true;
	hasFetched.value = false;
	try {
		const response = await mcpStore.getMcpEligibleAgents({
			take: 10,
			query: query ?? undefined,
		});
		agentOptions.value = response?.data ?? [];
	} catch (e) {
		toast.showError(e, i18n.baseText('settings.mcp.connectAgents.error'));
	} finally {
		await sleep(LOADING_INDICATOR_TIMEOUT);
		isLoading.value = false;
		hasFetched.value = true;
	}
}

function focusOnInput() {
	selectRef.value?.focusOnInput();
}

function onVisibleChange(visible: boolean) {
	isDropdownVisible.value = visible;
}

function onKeydownCapture(event: KeyboardEvent) {
	if (event.key === 'Enter' && !isDropdownVisible.value && modelValue.value.length > 0) {
		event.preventDefault();
		event.stopPropagation();
		emit('confirm');
	}
}

onMounted(async () => {
	await searchAgents();
	emit('ready');
});

defineExpose({
	focusOnInput,
});
</script>

<template>
	<div @keydown.enter.capture="onKeydownCapture">
		<PongSelect
			ref="selectRef"
			v-model="modelValue"
			data-test-id="mcp-agents-select"
			:placeholder="placeholder"
			:disabled="disabled"
			:loading="isLoading"
			:multiple="true"
			:filterable="true"
			:remote="true"
			:remote-method="searchAgents"
			size="medium"
			:popper-class="popperClass"
			:teleported="false"
			@visible-change="onVisibleChange"
		>
			<PongOption v-if="showEmptyState" value="" disabled :class="$style['empty-option']">
				{{ i18n.baseText('settings.mcp.connectAgents.emptyState') }}
			</PongOption>
			<PongOption
				v-for="agent in agentOptions"
				:key="agent.id"
				:value="agent.id"
				:label="agent.name"
			>
				<div :class="$style.option">
					<PongText :class="$style.truncate">{{ projectName(agent) }}</PongText>
					<span :class="$style.separator">/</span>
					<PongText :class="$style.truncate" color="text-dark">{{ agent.name }}</PongText>
				</div>
			</PongOption>
		</PongSelect>
	</div>
</template>

<style module lang="scss">
.mcp-agents-select-loading,
.mcp-agents-select-empty {
	display: flex;
	min-height: var(--spacing--5xl);
	align-items: center;
	justify-content: space-around;
}

.empty-option {
	cursor: default !important;
	color: var(--color--text) !important;
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow: hidden;
}

.separator {
	user-select: none;
	color: var(--color--text--tint-1);
}

.truncate {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}
</style>
