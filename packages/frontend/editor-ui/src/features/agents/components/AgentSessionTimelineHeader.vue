<script setup lang="ts">
import {
	PongBreadcrumbs,
	PongButton,
	PongDropdownMenu,
	PongIcon,
	PongIconButton,
	PongText,
	PongTooltip,
	type DropdownMenuItemProps,
	type IconOrEmoji,
	type PathItem,
} from '@pong/design-system';

import { computed } from 'vue';
import { useI18n } from '@pong/i18n';
import type { SessionTimelineMetadata } from '@/features/agents/types';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';

interface SessionDropdownData {
	date: string;
	active: boolean;
}

const props = defineProps<{
	breadcrumbItems: PathItem[];
	projectIcon: IconOrEmoji;
	sessionTitle: string;
	sessionOptions: Array<DropdownMenuItemProps<string, SessionDropdownData>>;
	showLangsmithExport: boolean;
	langsmithExportLoading: boolean;
	metadata?: SessionTimelineMetadata;
	hasSession?: boolean;
	canDeleteSession?: boolean;
	isDeletingSession?: boolean;
	showStop?: boolean;
	stopLoading?: boolean;
}>();

const emit = defineEmits<{
	'breadcrumb-select': [item: PathItem];
	'session-select': [sessionId: string];
	'langsmith-export': [];
	'copy-link': [];
	'delete-session': [];
	stop: [];
	close: [];
}>();

const i18n = useI18n();

const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() => [
	{
		id: 'copy-link',
		label: i18n.baseText('agents.builder.preview.more.copyLink'),
		icon: { type: 'icon', value: 'link' },
		disabled: !props.hasSession,
	},
	...(props.showLangsmithExport
		? ([
				{
					id: 'export-session',
					label: i18n.baseText('agentSessions.langsmithExport.button'),
					icon: { type: 'icon', value: 'bug' },
					disabled: !props.hasSession || props.langsmithExportLoading,
				},
			] satisfies Array<DropdownMenuItemProps<string>>)
		: []),
	...(props.canDeleteSession
		? ([
				{
					id: 'delete-session',
					label: i18n.baseText('agentSessions.delete'),
					icon: { type: 'icon', value: 'trash-2' },
					divided: true,
					destructive: true,
					disabled: !props.hasSession || props.isDeletingSession,
				},
			] satisfies Array<DropdownMenuItemProps<string>>)
		: []),
]);

function onMenuSelect(action: string) {
	if (!props.hasSession) return;
	if (action === 'copy-link') emit('copy-link');
	if (action === 'export-session' && props.showLangsmithExport && !props.langsmithExportLoading) {
		emit('langsmith-export');
	}
	if (action === 'delete-session' && props.canDeleteSession && !props.isDeletingSession) {
		emit('delete-session');
	}
}

const tokenFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1,
});

const costFormatter = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 4,
});
</script>

<template>
	<div :class="$style.topBar">
		<div :class="$style.topBarLeft">
			<PongBreadcrumbs
				:items="breadcrumbItems"
				theme="medium"
				@item-selected="emit('breadcrumb-select', $event)"
			>
				<template #prepend>
					<ProjectIcon :icon="props.projectIcon" size="mini" />
				</template>
				<template #append>
					<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
					<PongDropdownMenu
						:items="props.sessionOptions"
						placement="bottom-start"
						:extra-popper-class="$style.sessionDropdownMenu"
						data-testid="session-header-switcher"
						@select="emit('session-select', $event)"
					>
						<template #trigger>
							<PongButton
								variant="ghost"
								size="small"
								:class="$style.switcherButton"
								:aria-label="i18n.baseText('agentSessions.sessionName')"
							>
								<span :class="$style.switcherLabel">{{ props.sessionTitle }}</span>
								<PongIcon icon="chevron-down" :size="12" />
							</PongButton>
						</template>
						<template #item-label="{ item }">
							<span :class="$style.sessionDropdownName">
								{{ item.label }}
							</span>
						</template>
						<template #item-trailing="{ item }">
							<span v-if="item.data?.date" :class="$style.sessionDropdownDate">
								{{ item.data.date }}
							</span>
						</template>
					</PongDropdownMenu>
				</template>
			</PongBreadcrumbs>
		</div>
		<div :class="$style.topBarRight">
			<ul
				v-if="metadata"
				:class="$style.descriptionList"
				data-testid="agent-session-timeline-metadata"
			>
				<li v-if="metadata.trigger.label">
					<PongIcon color="text-light" :icon="metadata.trigger.icon" />
					<PongText step="xs" bold>{{ metadata.trigger.label }}</PongText>
				</li>
				<li :class="$style.numericMetadata">
					<PongIcon color="text-light" icon="hash" />
					<PongText step="xs" bold>
						{{ tokenFormatter.format(metadata.totalTokens).toUpperCase() }}
						<span v-if="metadata.totalCost !== null" :class="$style.innerLabel"
							>(${{ costFormatter.format(metadata.totalCost) }})</span
						>
					</PongText>
				</li>
				<li :class="$style.numericMetadata">
					<PongIcon color="text-light" icon="clock" />
					<PongText step="xs" bold>{{ metadata.durationLabel }}</PongText>
				</li>
			</ul>
			<PongTooltip placement="bottom" :content="i18n.baseText('agentSessions.actions')">
				<PongDropdownMenu
					:items="menuItems"
					placement="bottom-end"
					data-testid="agent-session-timeline-more-menu"
					@select="onMenuSelect"
				>
					<template #trigger>
						<PongIconButton
							icon="ellipsis"
							variant="ghost"
							size="small"
							icon-size="large"
							:aria-label="i18n.baseText('agentSessions.actions')"
							data-testid="agent-session-timeline-more-btn"
						/>
					</template>
				</PongDropdownMenu>
			</PongTooltip>
			<PongTooltip
				v-if="props.showStop"
				:content="i18n.baseText('agentSessions.stop')"
				:disabled="props.stopLoading"
			>
				<PongIconButton
					variant="ghost"
					size="medium"
					icon="square"
					:class="$style.stopButton"
					:aria-label="i18n.baseText('agentSessions.stop')"
					:loading="props.stopLoading"
					data-testid="agent-session-stop"
					@click="emit('stop')"
				/>
			</PongTooltip>
			<PongTooltip :content="i18n.baseText('generic.close')">
				<PongIconButton
					variant="ghost"
					icon="x"
					size="medium"
					:aria-label="i18n.baseText('generic.close')"
					data-testid="agent-session-timeline-close"
					data-test-id="agent-session-timeline-close"
					@click="emit('close')"
				/>
			</PongTooltip>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@pong/design-system/css/mixins/utils';

.topBar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	min-height: var(--height--4xl);
}

.topBarLeft {
	display: flex;
	align-items: center;
	flex: 1 1 auto;
	min-width: 0;
}

.topBarLeft :global(.pong-breadcrumbs) {
	min-width: 0;
}

.topBarLeft :global(.pong-breadcrumbs > ul) {
	min-width: 0;
}

.topBarLeft :global(.pong-breadcrumbs > ul > li:first-child) {
	display: none;
}

.topBarLeft :global(.pong-breadcrumbs [data-test-id='breadcrumbs-item']) {
	min-width: 0;
	display: flex;
	align-items: center;
	height: var(--height--md);
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.topBarRight {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	max-width: 100%;
	align-items: center;
	gap: var(--spacing--xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	user-select: none;
	color: var(--text-color--subtler);
	margin-left: auto;
}

.stopButton {
	color: var(--color--danger);
}

.crumbSeparator {
	color: var(--border-color);
	margin-inline: var(--spacing--4xs);
	user-select: none;
	font-size: var(--font-size--xl);
}

.switcherButton {
	flex-shrink: 0;
	font-size: var(--font-size--sm);
	gap: var(--spacing--4xs);
}

.switcherLabel {
	display: block;
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sessionDropdownMenu {
	min-width: 360px;
}

:global(.session-dropdown-item-active),
:global(.session-dropdown-item-active:hover),
:global(.session-dropdown-item-active:focus),
:global(.session-dropdown-item-active[data-highlighted]) {
	background-color: var(--background--active);
}

.sessionDropdownName {
	display: block;
	max-width: 60%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sessionDropdownDate {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	text-align: right;
	white-space: nowrap;
	margin-left: auto;
}
.numericMetadata {
	font-variant-numeric: tabular-nums;
}

.descriptionList {
	display: flex;
	flex-wrap: wrap;
	flex-direction: row;
	gap: var(--spacing--sm);

	.innerLabel {
		color: var(--text-color--subtler);
	}

	li {
		min-width: 0;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: var(--spacing--2xs);
		height: var(--height--sm);
		font-size: var(--font-size--sm);
		padding-inline: var(--spacing--xs);
		margin-inline: calc(var(--spacing--xs) * -1);
		background-color: transparent;
		border-radius: var(--radius);
		user-select: none;

		:global(.pong-icon) {
			flex-shrink: 0;
			height: auto;
		}

		:global(.pong-text) {
			flex: 1;
			padding-top: var(--spacing--5xs);
			@include utils.utils-ellipsis;
		}
	}
}
</style>
