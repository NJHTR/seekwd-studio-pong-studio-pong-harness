<script setup lang="ts">
import type {
	PromotionBindingConflict,
	PromotionBindingConsumer,
	PromotionResourceType,
} from '@pong/api-types';
import {
	PongButton,
	PongCallout,
	PongHeading,
	PongIcon,
	PongText,
	type IconName,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { usePromotionBindingCreation } from '../../composables/usePromotionBindingCreation';
import { usePromotionBindings } from '../../composables/usePromotionBindings';
import { usePromotionPreviewLabels } from '../../composables/usePromotionPreviewLabels';
import type { ApplyCheckResult, BlockedApplyResult } from '../../promotions.types';
import { resourceIcon } from '../../promotionPreview.tree';
import PromotionWorkflowLinks from './PromotionWorkflowLinks.vue';

const props = defineProps<{
	/** The Apply check, scoped to the workflows that the preview lists. Moved folders stay unscoped. */
	check: ApplyCheckResult;
	busy: boolean;
}>();

const emit = defineEmits<{
	/** A binding was created, so the preview and the check must load again. */
	refresh: [];
	inspect: [key: string];
}>();

const i18n = useI18n();
const labels = usePromotionPreviewLabels();

const asBlockedResult = ({
	environmentId,
	git,
	movedWorkflows,
	movedFolders,
	...check
}: ApplyCheckResult): BlockedApplyResult => ({ status: 'blocked', environmentId, git, check });

// The binding session lives as long as the commit. A later check for the same commit keeps the
// created bindings in the table as resolved.
const bindings = usePromotionBindings();
const creation = usePromotionBindingCreation(asBlockedResult(props.check), () => {});
let sessionCommit: string | undefined;
watch(
	() => props.check,
	(check) => {
		const result = asBlockedResult(check);
		creation.updateCheck(result.check);
		if (sessionCommit === check.git.commitSha) {
			bindings.reconcile(result);
			return;
		}
		sessionCommit = check.git.commitSha;
		bindings.start(result);
	},
	{ immediate: true },
);
onBeforeUnmount(bindings.end);

type BlockerRow = {
	key: string;
	icon: IconName;
	name: string;
	type: PromotionResourceType;
	usedBy: Array<{ key: string; name: string }>;
	status: { label: string; tone: 'warning' | 'success' };
	/** The next step for blockers that users resolve outside this page. */
	detail?: string;
	/** The button that adds a missing binding. */
	createLabel?: string;
};

const usedBy = (consumers: PromotionBindingConsumer[]) =>
	consumers.flatMap(({ workflows }) =>
		workflows.map(({ id, name }) => ({ key: `workflow:${id}`, name })),
	);

type StatusKey = 'missing' | 'resolved' | 'access' | 'conflict' | 'moved';

const status = (key: StatusKey) => ({
	label: i18n.baseText(`promotions.preview.blockers.status.${key}`),
	tone: key === 'resolved' ? ('success' as const) : ('warning' as const),
});

type HardConflict = Exclude<
	PromotionBindingConflict,
	{ code: 'destructive-change' } | { code: 'project-deletion' }
>;

const conflictRow = (conflict: HardConflict, index: number): BlockerRow => {
	if (conflict.code === 'moved') return movedRow(conflict.kind, conflict);
	const row = {
		key: `conflict:${index}`,
		status: status('conflict'),
		detail: i18n.baseText(`promotions.bindings.conflicts.${conflict.code}`),
	};
	if (conflict.kind === 'project') {
		return {
			...row,
			icon: resourceIcon('project'),
			name: conflict.project.name,
			type: 'project',
			usedBy:
				'workflows' in conflict
					? conflict.workflows.map(({ id, name }) => ({ key: `workflow:${id}`, name }))
					: [],
		};
	}
	if (conflict.kind === 'workflow') {
		const workflows = usedBy(conflict.consumers);
		return {
			...row,
			icon: resourceIcon('workflow'),
			name: workflows.map(({ name }) => name).join(', '),
			type: 'workflow',
			usedBy: workflows,
		};
	}
	if (conflict.kind === 'data-table' || conflict.kind === 'tag') {
		const type = conflict.kind === 'tag' ? 'tag' : 'dataTable';
		return {
			...row,
			icon: resourceIcon(type),
			// An import-wide issue, such as a disabled module, names no table or tag.
			name:
				conflict.name ?? conflict.id ?? i18n.baseText(`promotions.preview.blockers.type.${type}`),
			type,
			usedBy: usedBy(conflict.consumers),
		};
	}
	return {
		...row,
		icon: resourceIcon(conflict.kind),
		name: conflict.name,
		type: conflict.kind,
		usedBy: usedBy(conflict.consumers),
	};
};

function movedRow(
	type: 'workflow' | 'folder',
	move: ApplyCheckResult['movedWorkflows'][number],
): BlockerRow {
	return {
		key: `moved:${type}:${move.id}`,
		icon: resourceIcon(type),
		name: move.name,
		type,
		usedBy: [],
		status: status('moved'),
		detail: labels.moveDetail(type, move),
	};
}

const blockerRows = computed<BlockerRow[]>(() => {
	const { accessRequirements, movedWorkflows, movedFolders } = props.check;
	return [
		...bindings.rows.value.map(({ key, binding, status: bindingStatus }) => ({
			key,
			icon: resourceIcon(binding.kind),
			name: binding.name,
			type: binding.kind,
			usedBy: usedBy(binding.consumers),
			status: status(bindingStatus === 'resolved' ? 'resolved' : 'missing'),
			createLabel:
				bindingStatus === 'missing'
					? i18n.baseText(`promotions.preview.blockers.create.${binding.kind}`)
					: undefined,
		})),
		...accessRequirements.map((access) => ({
			key: `access:${access.sourceId}`,
			icon: resourceIcon('credential'),
			name: access.name,
			type: 'credential' as const,
			usedBy: usedBy(access.consumers),
			status: status('access'),
			detail: i18n.baseText('promotions.preview.blockers.access'),
		})),
		...bindings.hardConflicts.value.map(conflictRow),
		...movedWorkflows.map((move) => movedRow('workflow', move)),
		...movedFolders.map((move) => movedRow('folder', move)),
	];
});

const unresolvedCount = computed(
	() => blockerRows.value.filter((row) => row.status.tone === 'warning').length,
);

function removedColumns(
	changes: Extract<PromotionBindingConflict, { code: 'destructive-change' }>['changes'],
) {
	return changes
		.flatMap((change) =>
			change.kind === 'remove-column' || change.kind === 'change-column-type' ? change.column : [],
		)
		.join(', ');
}

const warnings = computed(() => props.check.warnings);

// Data table changes and variable warnings do not block Apply, so they share one section.
const warningCount = computed(
	() => bindings.destructiveChanges.value.length + warnings.value.length,
);
const open = ref({ blockers: true, warnings: true });

async function create(key: string) {
	await bindings.createBinding(key, creation.createBinding);
	if (bindings.rows.value.some((row) => row.key === key && row.status === 'resolved')) {
		emit('refresh');
	}
}

const isCreateDisabled = computed(() => props.busy || bindings.isBusy.value);
</script>

<template>
	<div :class="$style.blockers" data-test-id="promotion-preview-blockers">
		<slot />
		<PongText tag="p" color="text-base">
			{{ i18n.baseText('promotions.preview.blockers.intro') }}
		</PongText>

		<PongCallout
			v-if="unresolvedCount === 0"
			theme="success"
			slim
			role="status"
			data-test-id="promotion-preview-blockers-status"
		>
			{{ i18n.baseText('promotions.preview.blockers.none') }}
		</PongCallout>

		<PongCallout v-if="bindings.error.value?.kind === 'creationMismatch'" theme="danger">
			{{ i18n.baseText('promotions.bindings.error.creationMismatch') }}
		</PongCallout>

		<section v-if="blockerRows.length > 0" :class="$style.section">
			<button
				type="button"
				:class="$style.sectionHeader"
				:aria-expanded="open.blockers"
				@click="open.blockers = !open.blockers"
			>
				<PongIcon :icon="open.blockers ? 'chevron-down' : 'chevron-right'" size="small" />
				<PongHeading tag="h2" size="medium">
					{{
						i18n.baseText('promotions.preview.blockers.section.blockers', {
							adjustToNumber: blockerRows.length,
							interpolate: { count: String(blockerRows.length) },
						})
					}}
				</PongHeading>
			</button>
			<div v-show="open.blockers">
				<table
					:class="[$style.table, $style.fixedColumns]"
					data-test-id="promotion-preview-blockers-table"
				>
					<colgroup>
						<col :class="$style.nameColumn" />
						<col />
						<col :class="$style.typeColumn" />
						<col :class="$style.statusColumn" />
						<col :class="$style.actionColumn" />
					</colgroup>
					<thead>
						<tr>
							<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.name') }}</th>
							<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.usedBy') }}</th>
							<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.type') }}</th>
							<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.status') }}</th>
							<th
								scope="col"
								:aria-label="i18n.baseText('promotions.preview.blockers.column.action')"
							/>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in blockerRows"
							:key="row.key"
							data-test-id="promotion-preview-blocker-row"
							:data-blocker-key="row.key"
						>
							<td>
								<div :class="$style.name">
									<PongIcon :icon="row.icon" size="small" :class="$style.icon" />
									<PongText step="xs" color="text-dark">{{ row.name }}</PongText>
								</div>
								<PongText
									v-if="row.detail"
									tag="p"
									step="2xs"
									color="text-light"
									:class="$style.detail"
								>
									{{ row.detail }}
								</PongText>
							</td>
							<td>
								<PongText step="2xs" color="text-light">
									<PromotionWorkflowLinks
										:workflows="row.usedBy"
										@inspect="emit('inspect', $event)"
									/>
								</PongText>
							</td>
							<td>
								<PongText step="xs" color="text-base">
									{{ i18n.baseText(`promotions.preview.blockers.type.${row.type}`) }}
								</PongText>
							</td>
							<td aria-live="polite">
								<PongText size="medium" :class="[$style.status, $style[row.status.tone]]">
									<PongIcon
										:icon="row.status.tone === 'success' ? 'circle-check' : 'circle-alert'"
										size="small"
									/>
									{{ row.status.label }}
								</PongText>
							</td>
							<td :class="$style.action">
								<PongButton
									v-if="row.createLabel"
									variant="outline"
									size="small"
									:disabled="isCreateDisabled"
									data-test-id="promotion-preview-blocker-create"
									@click="create(row.key)"
								>
									{{ row.createLabel }}
								</PongButton>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section v-if="warningCount > 0" :class="$style.section">
			<button
				type="button"
				:class="$style.sectionHeader"
				:aria-expanded="open.warnings"
				@click="open.warnings = !open.warnings"
			>
				<PongIcon :icon="open.warnings ? 'chevron-down' : 'chevron-right'" size="small" />
				<PongHeading tag="h2" size="medium">
					{{
						i18n.baseText('promotions.preview.blockers.section.warnings', {
							adjustToNumber: warningCount,
							interpolate: { count: String(warningCount) },
						})
					}}
				</PongHeading>
			</button>
			<div v-show="open.warnings" :class="$style.groups">
				<div v-if="bindings.destructiveChanges.value.length > 0" :class="$style.group">
					<PongCallout theme="warning" :class="$style.callout">
						<PongText bold tag="p">{{
							i18n.baseText('promotions.preview.blockers.destructive.title')
						}}</PongText>
						{{
							i18n.baseText('promotions.bindings.destructive.confirmDescription', {
								adjustToNumber: bindings.destructiveChanges.value.length,
							})
						}}
					</PongCallout>
					<table :class="$style.table">
						<thead>
							<tr>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.dataTable') }}
								</th>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.usedBy') }}
								</th>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.columns') }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="table in bindings.destructiveChanges.value" :key="table.id">
								<td>
									<div :class="$style.name">
										<PongIcon :icon="resourceIcon('dataTable')" size="small" :class="$style.icon" />
										<PongText step="xs" color="text-dark">{{ table.name }}</PongText>
									</div>
								</td>
								<td>
									<PongText step="2xs" color="text-light">
										<PromotionWorkflowLinks
											:workflows="usedBy(table.consumers)"
											@inspect="emit('inspect', $event)"
										/>
									</PongText>
								</td>
								<td>
									<PongText step="xs" color="text-base">{{ removedColumns(table.changes) }}</PongText>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div v-if="warnings.length > 0" :class="$style.group">
					<PongCallout theme="info" :class="$style.callout">
						<PongText bold tag="p">{{
							i18n.baseText('promotions.preview.blockers.shadowed.title')
						}}</PongText>
						{{ i18n.baseText('promotions.preview.blockers.shadowed.description') }}
					</PongCallout>
					<table :class="$style.table">
						<thead>
							<tr>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.variable') }}
								</th>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.usedBy') }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="warning in warnings" :key="warning.name">
								<td>
									<div :class="$style.name">
										<PongIcon :icon="resourceIcon('variable')" size="small" :class="$style.icon" />
										<PongText step="xs" color="text-dark">{{ warning.name }}</PongText>
									</div>
								</td>
								<td>
									<PongText step="2xs" color="text-light">
										<PromotionWorkflowLinks
											:workflows="usedBy(warning.consumers)"
											@inspect="emit('inspect', $event)"
										/>
									</PongText>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<PongText
			v-if="unresolvedCount > 0"
			tag="p"
			step="xs"
			color="text-base"
			role="status"
			data-test-id="promotion-preview-blockers-status"
		>
			{{
				i18n.baseText('promotions.preview.blockers.unresolved', {
					adjustToNumber: unresolvedCount,
					interpolate: { count: String(unresolvedCount) },
				})
			}}
		</PongText>
	</div>
</template>

<style module lang="scss">
.blockers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) var(--spacing--lg);
	overflow-y: auto;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	align-self: flex-start;
	padding: 0;
	border: none;
	background: none;
	color: var(--text-color);
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--spacing--4xs);
	}
}

.groups {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.group {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--xs);
	overflow: hidden;

	.table {
		border: none;
		border-top: var(--border);
		border-radius: 0;
	}
}

.callout {
	border: none;
	border-radius: 0;
}

.table {
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--xs);
	border-collapse: separate;
	border-spacing: 0;
	overflow: hidden;

	th,
	td {
		padding: var(--spacing--xs) var(--spacing--sm);
		text-align: left;
		vertical-align: middle;
	}

	th {
		background-color: var(--background--subtle);
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
	}

	td {
		border-top: var(--border);
	}
}

/* Fixed widths keep the columns in place when the last action button goes away. */
.fixedColumns {
	table-layout: fixed;
}

.nameColumn {
	width: 36%;
}

.typeColumn,
.statusColumn {
	width: 12%;
}

.actionColumn {
	width: 16%;
}

.name {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.detail {
	margin-top: var(--spacing--4xs);
}

.status {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.warning {
	color: var(--text-color--warning);
}

.success {
	color: var(--text-color--success);
}

.action {
	text-align: right;
	white-space: nowrap;
}
</style>
