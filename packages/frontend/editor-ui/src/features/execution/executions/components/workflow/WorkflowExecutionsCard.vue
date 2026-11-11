<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { IExecutionUIData } from '../../composables/useExecutionHelpers';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import ExecutionsTime from '../ExecutionsTime.vue';
import { useExecutionHelpers } from '../../composables/useExecutionHelpers';
import type { ExecutionSummary } from 'pong-workflow';
import { useI18n } from '@pong/i18n';
import type { PermissionsRecord } from '@pong/permissions';
import { useSettingsStore } from '@pong/stores/settings.store';
import { toDayMonth, toTime } from '@/app/utils/formatters/dateFormatter';
import PrivateCredentialIcon from '@/features/resolvers/components/PrivateCredentialIcon.vue';
import {
	PongActionDropdown,
	PongIcon,
	PongSpinner,
	PongTags,
	PongText,
	PongTooltip,
} from '@pong/design-system';
const props = defineProps<{
	execution: ExecutionSummary;
	highlight?: boolean;
	showGap?: boolean;
	workflowPermissions: PermissionsRecord['workflow'];
}>();

const emit = defineEmits<{
	retryExecution: [{ execution: ExecutionSummary; command: string }];
	mounted: [string];
}>();

const route = useRoute();
const locale = useI18n();

const executionHelpers = useExecutionHelpers();
const settingsStore = useSettingsStore();

const isAdvancedExecutionFilterEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);
const isAnnotationEnabled = computed(() => isAdvancedExecutionFilterEnabled.value);

const workflowId = useInjectWorkflowId();

const hasPrivateCredentials = computed(() => props.execution.usedPrivateCredentials === true);
const retryExecutionActions = computed(() => [
	{
		id: 'current-workflow',
		label: locale.baseText('executionsList.retryWithCurrentVersion'),
		description: locale.baseText('executionsList.retryWithCurrentVersionDescription'),
	},
	{
		id: 'original-workflow',
		label: locale.baseText('executionsList.retryWithOriginalVersion'),
		description: locale.baseText('executionsList.retryWithOriginalVersionDescription'),
	},
]);
const executionUIDetails = computed<IExecutionUIData>(() =>
	executionHelpers.getUIDetails(props.execution),
);
const isActive = computed(() => props.execution.id === route.params.executionId);
const isRetriable = computed(() => executionHelpers.isExecutionRetriable(props.execution));

onMounted(() => {
	emit('mounted', props.execution.id);
});

function onRetryMenuItemSelect(action: string): void {
	emit('retryExecution', { execution: props.execution, command: action });
}
</script>

<template>
	<div
		:class="{
			['execution-card']: true,
			[$style.WorkflowExecutionsCard]: true,
			[$style.active]: isActive,
			[$style[executionUIDetails.name]]: true,
			[$style.highlight]: highlight,
			[$style.showGap]: showGap,
		}"
	>
		<RouterLink
			:class="$style.executionLink"
			:to="{
				name: VIEWS.EXECUTION_PREVIEW,
				params: { workflowId: workflowId, executionId: execution.id },
				query: route.query,
			}"
			:data-test-execution-status="executionUIDetails.name"
		>
			<div :class="$style.description">
				<PongText
					v-if="executionUIDetails.name === 'new'"
					color="text-dark"
					:bold="true"
					size="medium"
					data-test-id="execution-time"
				>
					{{ toDayMonth(executionUIDetails.createdAt) }} -
					{{ locale.baseText('executionDetails.startingSoon') }}
				</PongText>
				<PongText v-else color="text-dark" :bold="true" size="medium" data-test-id="execution-time">
					{{ executionUIDetails.startTime }}
				</PongText>
				<div :class="$style.executionStatus">
					<PongSpinner
						v-if="executionUIDetails.name === 'running'"
						size="small"
						:class="[$style.spinner, 'mr-4xs']"
					/>
					<PongText :class="$style.statusLabel" size="small">{{ executionUIDetails.label }}</PongText>
					{{ ' ' }}
					<PongText
						v-if="executionUIDetails.name === 'running' && !execution.stoppedAt"
						:color="isActive ? 'text-dark' : 'text-base'"
						size="small"
						data-test-id="execution-time-in-status"
					>
						{{ locale.baseText('executionDetails.runningTimeRunning') }}
						<!-- Just here to make typescript happy, since `startedAt` will always be defined for running executions -->
						<ExecutionsTime :start-time="execution.startedAt ?? execution.createdAt" />
					</PongText>
					<PongText
						v-if="executionUIDetails.name === 'new' && execution.createdAt"
						:color="isActive ? 'text-dark' : 'text-base'"
						size="small"
					>
						<span
							>{{ locale.baseText('executionDetails.at') }} {{ toTime(execution.createdAt) }}</span
						>
					</PongText>
					<PongText
						v-else-if="executionUIDetails.runningTime !== ''"
						:color="isActive ? 'text-dark' : 'text-base'"
						size="small"
					>
						{{
							locale.baseText('executionDetails.runningTimeFinished', {
								interpolate: { time: executionUIDetails?.runningTime },
							})
						}}
					</PongText>
				</div>
				<div v-if="execution.mode === 'retry'">
					<PongText :color="isActive ? 'text-dark' : 'text-base'" size="small">
						{{ locale.baseText('executionDetails.retry') }} #{{ execution.retryOf }}
					</PongText>
				</div>
				<div v-if="isAnnotationEnabled" :class="$style.annotation">
					<div v-if="execution.annotation?.vote" :class="$style.ratingIcon">
						<PongIcon v-if="execution.annotation.vote == 'up'" :class="$style.up" icon="thumbs-up" />
						<PongIcon v-else :class="$style.down" icon="thumbs-down" />
					</div>
					<PongTags
						v-if="executionUIDetails.tags.length > 0"
						:tags="executionUIDetails.tags"
						:clickable="false"
					></PongTags>
				</div>
			</div>
			<div :class="$style.icons">
				<PongActionDropdown
					v-if="isRetriable"
					:class="[$style.icon, $style.retry]"
					:items="retryExecutionActions"
					:disabled="!workflowPermissions.execute"
					activator-icon="redo-2"
					placement="bottom-end"
					data-test-id="retry-execution-button"
					@select="onRetryMenuItemSelect"
				>
					<template #menuItem="item">
						<div :class="$style.retryMenuItem">
							<PongText size="small" color="text-dark" bold>{{ item.label }}</PongText>
							<PongText size="xsmall" color="text-light">{{ item.description }}</PongText>
						</div>
					</template>
				</PongActionDropdown>
				<PrivateCredentialIcon
					v-if="hasPrivateCredentials"
					:class="$style.icon"
					:tooltip-text="locale.baseText('executions.privateCredential.tooltip')"
					data-test-id="execution-card-private-credential"
				/>
				<PongTooltip v-if="execution.mode === 'manual'" placement="top">
					<template #content>
						<span>{{ locale.baseText('executionsList.test') }}</span>
					</template>
					<PongIcon :class="[$style.icon, $style.manual]" icon="flask-conical" />
				</PongTooltip>
				<PongTooltip v-if="execution.mode === 'evaluation'" placement="top">
					<template #content>
						<span>{{ locale.baseText('executionsList.evaluation') }}</span>
					</template>
					<PongIcon :class="[$style.icon, $style.evaluation]" icon="check-check" />
				</PongTooltip>
			</div>
		</RouterLink>
	</div>
</template>

<style module lang="scss">
@use '@/app/css/variables' as *;

.WorkflowExecutionsCard {
	--execution-list-item--color--background: var(--execution-card--color--background);
	--execution-list-item--color--background--highlight: var(--color--warning--tint-1);

	display: flex;
	flex-direction: column;
	padding-right: var(--spacing--md);

	&.active {
		border-left: var(--spacing--4xs) var(--border-style) transparent !important;

		.executionStatus {
			color: var(--color--text--shade-1) !important;
		}
	}

	&:hover,
	&.active {
		.executionLink {
			--execution-list-item--color--background: var(--execution-card--color--background--hover);
		}
	}

	&.new,
	&.running {
		.spinner {
			position: relative;
			top: 1px;
		}
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--running);
		}
		.statusLabel,
		.spinner {
			color: var(--color--warning);
		}
	}

	&.success {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--success);
		}
	}

	&.new {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--waiting);
		}
		.statusLabel {
			color: var(--execution-card--color--text--waiting);
		}
	}

	&.waiting {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--waiting);
		}
		.statusLabel {
			color: var(--color--secondary);
		}
	}

	&.error {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--error);
		}
		.statusLabel {
			color: var(--color--danger);
		}
	}

	&.unknown {
		&,
		& .executionLink {
			border-left: var(--spacing--4xs) var(--border-style)
				var(--execution-card--border-color--unknown);
		}
	}

	.annotation {
		display: flex;
		flex-direction: row;
		gap: var(--spacing--3xs);
		align-items: center;
		margin: var(--spacing--4xs) 0 0;

		.ratingIcon {
			.up {
				color: var(--color--success);
			}
			.down {
				color: var(--color--danger);
			}
		}
	}
}

.executionLink {
	background: var(--execution-list-item--color--background);
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: space-between;
	color: var(--color--text);
	font-size: var(--font-size--xs);
	padding: var(--spacing--xs);
	padding-right: var(--spacing--sm);
	position: relative;
	left: calc(
		-1 * var(--spacing--4xs)
	); // Hide link border under card border so it's not visible when not hovered

	&:active {
		.icon,
		.statusLabel {
			color: var(--color--text);
		}
	}
}

.description {
	min-width: 0;
}

.icons {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	min-width: calc(2 * var(--font-size--sm) + var(--spacing--2xs));
	flex-shrink: 0;
}

.icon {
	font-size: var(--font-size--sm);
	width: var(--font-size--sm);
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;

	&.retry {
		width: var(--height--md);

		svg {
			color: var(--color--primary);
		}
	}

	&.manual {
		position: relative;
		top: 1px;
	}
}

.retryMenuItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.showGap {
	margin-bottom: var(--spacing--2xs);
	.executionLink {
		border-bottom: 1px solid var(--color--foreground--shade-1);
	}
}
</style>
