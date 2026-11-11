<script setup lang="ts">
import { computed, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import PongBadge from '../PongBadge';
import PongCallout from '../PongCallout';
import PongHeading from '../PongHeading';
import PongIcon from '../PongIcon';
import PongLink from '../PongLink';
import PongPopover from '../PongPopover';
import PongText from '../PongText';

interface SuggestedAction {
	id: string;
	title: string;
	description: string;
	moreInfoLink?: string;
	completed?: boolean;
}

export interface SuggestedActionsProps {
	title: string;
	actions: SuggestedAction[];
	open: boolean;
	ignoreAllLabel?: string;
	popoverAlignment?: 'start' | 'end' | 'center';
	popoverSideOffset?: number;
	notice?: string;
	/** Render an invisible popover anchor instead of the count pill; opening is then fully controlled via `open`. */
	hideTrigger?: boolean;
}

interface SuggestedActionsEmits {
	(event: 'action-click', actionId: string): void;
	(event: 'ignore-click', actionId: string): void;
	(event: 'ignore-all'): void;
	(event: 'update:open', open: boolean): void;
}

defineOptions({ name: 'PongSuggestedActions' });

const props = withDefaults(defineProps<SuggestedActionsProps>(), {
	ignoreAllLabel: undefined,
	popoverAlignment: undefined,
	popoverSideOffset: undefined,
	notice: undefined,
});

const emit = defineEmits<SuggestedActionsEmits>();
const { t } = useI18n();

const ignoringActions = ref<Set<string>>(new Set());

const completedCount = computed(() => props.actions.filter((action) => action.completed).length);

const handleActionClick = (action: SuggestedAction) => {
	if (!action.completed) {
		emit('action-click', action.id);
	}
};

const handleIgnoreClick = (actionId: string) => {
	ignoringActions.value.add(actionId);
	setTimeout(() => {
		emit('ignore-click', actionId);
		ignoringActions.value.delete(actionId);
	}, 500);
};
</script>

<template>
	<PongPopover
		:open="open"
		width="360px"
		max-height="500px"
		:align="popoverAlignment"
		:side-offset="popoverSideOffset"
		@update:open="$emit('update:open', $event)"
	>
		<template #trigger>
			<span v-if="hideTrigger" :class="$style.hiddenTrigger" />
			<div v-else :class="$style.triggerContainer" data-test-id="suggested-action-count">
				<PongBadge :class="[$style.countBadge, { [$style.activeTrigger]: open }]" size="small">
					{{ completedCount }} / {{ actions.length }}
				</PongBadge>
			</div>
		</template>
		<template #content>
			<div :class="$style.popoverContent">
				<div :class="$style.header">
					<PongHeading tag="h4">{{ title }}</PongHeading>
					<PongLink
						theme="text"
						:title="t('generic.close')"
						data-test-id="suggested-actions-close"
						@click.prevent.stop="emit('update:open', false)"
					>
						<PongIcon icon="x" size="large" />
					</PongLink>
				</div>
				<PongCallout v-if="notice" theme="warning">{{ notice }}</PongCallout>
				<div
					v-for="action in actions"
					:key="action.id"
					:class="[
						{
							[$style.actionItem]: true,
							[$style.ignoring]: ignoringActions.has(action.id),
							[$style.actionable]: !action.completed,
						},
					]"
					data-test-id="suggested-action-item"
					:data-action-id="action.id"
					@click.prevent.stop="() => handleActionClick(action)"
				>
					<div :class="$style.checkboxContainer">
						<PongIcon v-if="action.completed" icon="circle-check" color="success" />
						<PongIcon v-else icon="circle" color="foreground-dark" />
					</div>
					<div :class="$style.actionItemBody">
						<div :class="[action.completed ? '' : 'mb-3xs', $style.actionHeader]">
							<PongText size="medium" :bold="true">{{ action.title }}</PongText>
						</div>
						<div v-if="!action.completed">
							<PongText size="small" color="text-base">
								{{ action.description }}
								<PongLink
									v-if="action.moreInfoLink"
									:to="action.moreInfoLink"
									size="small"
									theme="text"
									new-window
									underline
									@click.stop
								>
									{{ t('generic.moreInfo') }}
								</PongLink>
							</PongText>
						</div>
					</div>
					<PongLink
						theme="text"
						:title="t('generic.ignore')"
						data-test-id="suggested-action-ignore"
						@click.prevent.stop="handleIgnoreClick(action.id)"
					>
						<PongIcon v-if="!action.completed" icon="x" size="large" />
					</PongLink>
				</div>
				<div :class="$style.ignoreAllContainer">
					<PongLink
						theme="text"
						size="small"
						underline
						data-test-id="suggested-action-ignore-all"
						@click.prevent.stop="emit('ignore-all')"
					>
						{{ ignoreAllLabel ?? t('generic.ignoreAll') }}
					</PongLink>
				</div>
			</div>
		</template>
	</PongPopover>
</template>

<style lang="scss" module>
.triggerContainer {
	display: inline-block;
	position: relative;
	cursor: pointer;
}

.hiddenTrigger {
	display: block;
	width: 0;
	height: 0;
}

.countBadge.activeTrigger {
	--pong-badge--text-color: var(--color--primary);
	--pong-badge--border-color: var(--color--primary);
}

.popoverContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md) var(--spacing--sm);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.actionItem {
	display: flex;
	flex-direction: row;
	transition:
		opacity 0.3s ease,
		filter 0.3s ease;
	&:not(:last-child) {
		border-bottom: var(--border);
	}

	&.ignoring {
		opacity: 0.5;
		filter: grayscale(0.8);
		pointer-events: none;
		cursor: not-allowed;
	}
}

.actionable {
	&:hover {
		cursor: pointer;

		.actionHeader {
			color: var(--color--primary);
		}

		&:has(a:hover) {
			.actionHeader {
				color: var(--color--text--shade-1);
			}
		}
	}
}

.actionItemBody {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	padding-bottom: var(--spacing--sm);
}

.checkboxContainer {
	padding-top: 1px;
	padding-right: var(--spacing--xs);
}

.ignoreAllContainer {
	padding-left: var(--spacing--5xs);
}
</style>
