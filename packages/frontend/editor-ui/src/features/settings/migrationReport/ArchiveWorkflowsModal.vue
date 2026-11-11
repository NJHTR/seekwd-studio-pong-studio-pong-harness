<script lang="ts" setup>
import TimeAgo from '@/app/components/TimeAgo.vue';
import type { BreakingChangeRuleDetailWorkflow } from '@pong/api-types';
import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongDialogHeader,
	PongDialogTitle,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import { TARGET_VERSION_DISPLAY, type ArchiveWorkflowsModalMode } from './constants';

const props = defineProps<{
	mode: ArchiveWorkflowsModalMode;
	workflows: BreakingChangeRuleDetailWorkflow[];
}>();

const emit = defineEmits<{
	close: [];
	confirm: [];
}>();

const i18n = useI18n();

const isPrompt = computed(() => props.mode === 'prompt');
const published = computed(() => props.workflows.filter((workflow) => workflow.active));

const title = computed(() => {
	if (isPrompt.value) {
		return i18n.baseText('settings.migrationReport.detail.wontFix.archive.prompt.title', {
			interpolate: { name: props.workflows[0]?.name ?? '' },
		});
	}
	const count = props.workflows.length;
	return i18n.baseText('settings.migrationReport.detail.wontFix.archive.confirm.title', {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
});

const publishedNote = computed(() => {
	if (published.value.length === 0) return '';
	if (props.workflows.length === 1) {
		return i18n.baseText('settings.migrationReport.detail.wontFix.archive.published');
	}
	const count = published.value.length;
	return i18n.baseText('settings.migrationReport.detail.wontFix.archive.confirm.published', {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
});

const cancelLabel = computed(() =>
	isPrompt.value
		? i18n.baseText('settings.migrationReport.detail.wontFix.archive.prompt.keep')
		: i18n.baseText('generic.cancel'),
);

const confirmLabel = computed(() =>
	isPrompt.value
		? i18n.baseText('settings.migrationReport.detail.wontFix.archive.prompt.archive')
		: i18n.baseText('settings.migrationReport.detail.bulk.wontFixAndArchive'),
);

function confirm() {
	emit('confirm');
	emit('close');
}
</script>

<template>
	<PongDialog :open="true" @update:open="(open: boolean) => !open && emit('close')">
		<PongDialogHeader>
			<PongDialogTitle>{{ title }}</PongDialogTitle>
		</PongDialogHeader>
		<PongDialogBody>
			<div :class="$style.content" data-test-id="archive-workflows-modal">
				<PongText v-if="isPrompt" color="text-dark">
					{{
						i18n.baseText('settings.migrationReport.detail.wontFix.archive.prompt.description', {
							interpolate: { version: TARGET_VERSION_DISPLAY },
						})
					}}
				</PongText>
				<PongText v-if="publishedNote" color="text-dark">{{ publishedNote }}</PongText>
				<ul v-if="!isPrompt" :class="$style.list" data-test-id="archive-workflows-modal-list">
					<li v-for="workflow in published" :key="workflow.id" :class="$style.row">
						<PongText color="text-dark" :class="$style.name">{{ workflow.name }}</PongText>
						<PongText size="small" color="text-light">
							<I18nT
								v-if="workflow.lastExecutedAt"
								keypath="settings.migrationReport.detail.table.lastRun"
								tag="span"
								scope="global"
							>
								<template #time>
									<TimeAgo :date="workflow.lastExecutedAt.toString()" />
								</template>
							</I18nT>
							<template v-else>
								{{ i18n.baseText('settings.migrationReport.detail.table.neverRun') }}
							</template>
						</PongText>
					</li>
				</ul>
			</div>
		</PongDialogBody>
		<PongDialogFooter>
			<div :class="$style.actions">
				<PongButton
					variant="outline"
					:label="cancelLabel"
					data-test-id="archive-workflows-modal-cancel-button"
					@click="emit('close')"
				/>
				<PongButton
					:label="confirmLabel"
					data-test-id="archive-workflows-modal-confirm-button"
					@click="confirm"
				/>
			</div>
		</PongDialogFooter>
	</PongDialog>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.list {
	max-height: calc(5 * var(--spacing--2xl));
	overflow-y: auto;
	border: var(--border);
	border-radius: var(--radius);
}

.row {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
