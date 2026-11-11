<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useMcpJsonNudgeEligibility } from '@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeEligibility';
import type { McpJsonNudgeAction } from '@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeTrigger';
import { McpClientLogoCards, MCP_SETTINGS_VIEW } from '@pong/frontend-module-mcp';
import { useTelemetry } from '@pong/composables/useTelemetry';
import { PongButton, PongCheckbox, PongText } from '@pong/design-system';
import { type BaseTextKey, useI18n } from '@pong/i18n';
import { TELEMETRY_EVENT } from '@pong/telemetry';
import { createEventBus } from '@pong/utils/event-bus';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	MCP_JSON_NUDGE_MODAL_KEY,
	type McpJsonNudgeSurface,
} from '@/experiments/mcpJsonNudge/constants';

const props = defineProps<{
	data: {
		surface: McpJsonNudgeSurface;
		/** The gated export/import. Runs on Skip or dismiss; Connect abandons it. */
		onContinue?: McpJsonNudgeAction;
	};
}>();

const i18n = useI18n();
const router = useRouter();
const telemetry = useTelemetry();
const eligibility = useMcpJsonNudgeEligibility();
const modalBus = createEventBus();

const closedByAction = ref(false);
const dontShowAgain = ref(false);

const TITLE_KEY_BY_SURFACE = {
	export: 'experiments.mcpJsonNudge.modal.export.title',
	import_file: 'experiments.mcpJsonNudge.modal.import.title',
	import_url: 'experiments.mcpJsonNudge.modal.import.title',
	copy: 'experiments.mcpJsonNudge.modal.copy.title',
	paste: 'experiments.mcpJsonNudge.modal.paste.title',
} as const satisfies Record<McpJsonNudgeSurface, BaseTextKey>;

const title = computed(() => i18n.baseText(TITLE_KEY_BY_SURFACE[props.data.surface]));

function onDontShowAgainChange(value: boolean) {
	dontShowAgain.value = value;
	if (value) {
		telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_OPTED_OUT, { surface: props.data.surface });
		void eligibility.dismissForever();
	}
}

function onConnect(close: () => void) {
	closedByAction.value = true;
	telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_CONNECT_CLICKED, { surface: props.data.surface });
	void router.push({ name: MCP_SETTINGS_VIEW });
	close();
}

function onSkip(close: () => void) {
	closedByAction.value = true;
	telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_SKIPPED, { surface: props.data.surface });
	void props.data.onContinue?.();
	close();
}

// × / esc / click-outside: the user did not pick an action, so the original
// export/import still completes.
function onModalClosed() {
	if (!closedByAction.value) {
		telemetry.track(TELEMETRY_EVENT.MCP.MCP_NUDGE_DISMISSED, { surface: props.data.surface });
		void props.data.onContinue?.();
	}
}

onMounted(() => {
	modalBus.on('closed', onModalClosed);
});

onBeforeUnmount(() => {
	modalBus.off('closed', onModalClosed);
});
</script>

<template>
	<Modal :name="MCP_JSON_NUDGE_MODAL_KEY" :title="title" width="480px" :event-bus="modalBus">
		<template #content>
			<McpClientLogoCards :class="$style.logoCards" />
			<PongText color="text-base">
				{{ i18n.baseText('experiments.mcpJsonNudge.modal.body') }}
			</PongText>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<PongCheckbox
					:model-value="dontShowAgain"
					data-test-id="mcp-json-nudge-dont-show-again"
					@update:model-value="onDontShowAgainChange"
				>
					<template #label>{{ i18n.baseText('generic.dontShowAgain') }}</template>
				</PongCheckbox>
				<div :class="$style.actions">
					<PongButton
						variant="outline"
						size="small"
						:label="i18n.baseText('experiments.mcpJsonNudge.modal.skip')"
						data-test-id="mcp-json-nudge-skip-button"
						@click="onSkip(close)"
					/>
					<PongButton
						variant="solid"
						size="small"
						:label="i18n.baseText('experiments.mcpJsonNudge.modal.connect')"
						data-test-id="mcp-json-nudge-connect-button"
						@click="onConnect(close)"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.logoCards {
	/* The tiles rotate ±8deg; Modal's content area clips (overflow: hidden,
	   near-zero inline padding), so the rotated corners need breathing room. */
	padding: var(--spacing--xs) var(--spacing--md);
	margin-bottom: var(--spacing--xs);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
