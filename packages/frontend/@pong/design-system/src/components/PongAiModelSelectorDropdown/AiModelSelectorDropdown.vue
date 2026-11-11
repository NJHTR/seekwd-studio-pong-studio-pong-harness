<script
	setup
	lang="ts"
	generic="TData extends AiModelSelectorMenuItemData = AiModelSelectorMenuItemData"
>
import { truncateBeforeLast } from '@pong/utils/string/truncate';
import { Primitive } from 'reka-ui';
import { computed, getCurrentInstance, useCssModule, useTemplateRef } from 'vue';

import type {
	AiModelSelectorMenuItem,
	AiModelSelectorMenuItemData,
} from './AiModelSelectorDropdown.types';
import { useI18n } from '../../composables/useI18n';
import PongBadge from '../PongBadge';
import PongDropdownMenu from '../PongDropdownMenu/DropdownMenu.vue';
import PongIcon from '../PongIcon';
import PongText from '../PongText';
import PongTooltip from '../PongTooltip';

const MAX_SELECTED_NAME_CHARS = 30;

/**
 * Model lists are long, so the provider sub-menus get twice the shared cap.
 * Applies to every consumer of this dropdown, which is why it is set here
 * rather than passed in per call site.
 */
const SUB_MENU_MAX_HEIGHT = 'calc(var(--spacing--5xl) * 2)';

const {
	items,
	isLoading = false,
	selectedLabel,
	selectedCredentialName,
	credentialsMissing = false,
	credentialsMissingLabel,
	restrictedLabel,
	noMatchLabel,
	showBorder = true,
	disabled = false,
	dataTestId,
	credentialDataTestId,
} = defineProps<{
	/** Menu items to render in the dropdown. */
	items: Array<AiModelSelectorMenuItem<TData>>;
	/** Whether the dropdown is currently loading items. */
	isLoading?: boolean;
	/** Label for the currently selected model shown in the trigger. */
	selectedLabel: string;
	/** Credential name shown below the selected model, when available. */
	selectedCredentialName?: string;
	/** Whether to show the missing-credentials state in the trigger. */
	credentialsMissing?: boolean;
	/** Text shown when credentials are required but missing. */
	credentialsMissingLabel?: string;
	/** Badge shown in the trigger when a policy blocks the selected item. */
	restrictedLabel?: string;
	/** Empty-state text shown when search returns no matching items. */
	noMatchLabel: string;
	/** Whether the trigger button should render with a border. */
	showBorder?: boolean;
	/** Whether the trigger is disabled and cannot open the dropdown. */
	disabled?: boolean;
	/** Test id applied to the trigger button. */
	dataTestId: string;
	/** Test id applied to the selected credential label. */
	credentialDataTestId: string;
}>();

const emit = defineEmits<{
	select: [id: string];
	/**
	 * Use this to handle custom search logic in the parent.
	 * Provide filtered `items` from the parent when handling this event.
	 */
	search: [query: string];
}>();

defineSlots<{
	'trigger-leading'?: (props: { ui: { class: string } }) => void;
	'item-leading'?: (props: { item: AiModelSelectorMenuItem<TData>; ui: { class: string } }) => void;
	'item-restricted'?: (props: { item: AiModelSelectorMenuItem<TData> }) => void;
}>();

const dropdownRef = useTemplateRef('dropdownRef');
const $style = useCssModule();
const instance = getCurrentInstance();
const { t } = useI18n();

const resolvedCredentialsMissingLabel = computed(
	() => credentialsMissingLabel ?? t('aiModelSelector.credentialsMissing'),
);
const hasSearchListener = computed(() => Boolean(instance?.vnode.props?.onSearch));

const searchListenerAttrs = computed(() =>
	hasSearchListener.value && !disabled
		? { onSearch: (query: string) => emit('search', query) }
		: {},
);

function handleSelect(id: string) {
	if (disabled) return;
	emit('select', id);
}

defineExpose({
	open: () => {
		if (!disabled) dropdownRef.value?.open();
	},
	close: () => dropdownRef.value?.close(),
});
</script>

<template>
	<PongDropdownMenu
		ref="dropdownRef"
		:items="items"
		:empty-text="noMatchLabel"
		v-bind="searchListenerAttrs"
		placement="bottom-start"
		teleported
		searchable
		width="var(--reka-dropdown-menu-trigger-width)"
		:sub-menu-max-height="SUB_MENU_MAX_HEIGHT"
		@select="handleSelect"
	>
		<template #trigger>
			<Primitive
				as="button"
				:class="[$style.dropdownButton, !showBorder && $style.dropdownButtonBorderless]"
				:disabled="disabled"
				:data-test-id="dataTestId"
			>
				<div :class="$style.selected">
					<slot name="trigger-leading" :ui="{ class: $style.icon }" />
					<div :class="$style.selectedLabel">
						<PongText bold truncate>
							{{ truncateBeforeLast(selectedLabel, MAX_SELECTED_NAME_CHARS) }}
						</PongText>
						<span v-if="isLoading" :class="$style.loading"></span>
						<PongBadge
							v-else-if="restrictedLabel"
							variant="danger"
							size="small"
							:class="$style.credsBadge"
							data-test-id="ai-model-selector-restricted-badge"
						>
							{{ restrictedLabel }}
						</PongBadge>
						<PongBadge
							v-else-if="credentialsMissing"
							variant="danger"
							size="small"
							:class="$style.credsBadge"
						>
							{{ resolvedCredentialsMissingLabel }}
						</PongBadge>
						<PongText
							v-else-if="selectedCredentialName"
							bold
							color="text-light"
							:data-test-id="credentialDataTestId"
						>
							{{ truncateBeforeLast(selectedCredentialName, MAX_SELECTED_NAME_CHARS) }}
						</PongText>
					</div>
				</div>
				<PongIcon :class="$style.chevron" icon="chevron-down" size="medium" />
			</Primitive>
		</template>

		<template #item-leading="{ item, ui }">
			<slot name="item-leading" :item="item" :ui="{ class: ui.class }" />
			<PongIcon
				v-if="!item.data && item.icon?.type === 'icon'"
				:icon="item.icon.value"
				:class="ui.class"
				color="text-light"
				size="large"
			/>
			<span v-else-if="!item.data && item.icon?.type === 'emoji'" :class="[$style.emoji, ui.class]">
				{{ item.icon.value }}
			</span>
		</template>

		<template #item-label="{ item, ui }">
			<template v-if="item.data?.parts">
				<div :class="[$style.flattenedLabel, ui.class]">
					<template v-for="(part, index) in item.data.parts" :key="index">
						<PongText v-if="index > 0" color="text-light" :class="$style.separator">
							<PongIcon icon="chevron-right" size="small" />
						</PongText>
						<PongText
							size="medium"
							:color="index === item.data.parts.length - 1 ? 'text-dark' : 'text-base'"
						>
							{{ part }}
						</PongText>
					</template>
				</div>
			</template>
			<div v-else :class="[$style.labelWithBadge, ui.class]">
				<span v-if="item.data?.loading" :class="$style.modelLoading" aria-hidden="true"></span>
				<PongText v-else size="medium" :color="item.disabled ? 'text-xlight' : 'text-dark'">
					{{ item.label }}
				</PongText>
				<PongBadge
					v-if="item.data?.badgeLabel"
					:class="$style.badge"
					variant="secondary"
					size="xsmall"
				>
					{{ item.data.badgeLabel }}
				</PongBadge>
				<PongBadge
					v-if="item.data?.actionPill"
					size="xxsmall"
					:variant="
						item.data.actionPill.type === 'danger' || item.data.actionPill.type === 'info'
							? item.data.actionPill.type
							: 'success'
					"
				>
					{{ item.data.actionPill.text }}
				</PongBadge>
				<span v-if="item.data?.connectedLabel" :class="$style.connected">
					<PongIcon icon="check" size="small" :class="$style.connectedIcon" />
					<PongText size="small" color="text-light">{{ item.data.connectedLabel }}</PongText>
				</span>
			</div>
		</template>

		<template #item-trailing="{ item, ui }">
			<span v-if="item.data?.restrictedLabel" :class="[$style.restricted, ui.class]">
				<PongText size="xsmall" color="text-light" data-test-id="ai-model-selector-restriction">
					{{ item.data.restrictedLabel }}
				</PongText>
				<slot name="item-restricted" :item="item">
					<PongIcon
						icon="lock"
						size="xsmall"
						color="text-light"
						data-test-id="ai-model-selector-restricted-icon"
					/>
				</slot>
			</span>
			<PongTooltip
				v-else-if="item.data?.description"
				:content="truncateBeforeLast(item.data.description, 320, 0)"
				:class="ui.class"
				placement="right"
				teleported
			>
				<PongIcon icon="info" size="medium" color="text-light" :class="$style.infoIcon" />
			</PongTooltip>
		</template>
	</PongDropdownMenu>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';
@use '../../css/mixins/motion' as motion;

.dropdownButton {
	// Keep the trigger height when a parent uses a column flex layout.
	flex: 1 1 auto;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	height: var(--pong-ai-select--height, var(--height--lg));
	padding: 0 var(--spacing--xs);
	gap: var(--spacing--xs);
	border: var(--border);
	background-color: var(--background--surface);
	border-radius: var(--radius--2xs);
	font-size: var(--font-size--sm);
	outline: none;

	&:focus-visible {
		@include focus.focus-ring;
		border-color: var(--focus--border-color) !important;
		transition: none;
	}

	&:hover {
		background-color: color-mix(in srgb, var(--background--surface) 90%, black 5%);
	}

	&:active,
	&[aria-expanded='true'],
	:global([aria-expanded='true']) & {
		background-color: color-mix(in srgb, var(--background--surface) 90%, black 10%);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
}

.dropdownButtonBorderless {
	border-color: transparent;
	background-color: transparent;
	padding: 0 var(--spacing--2xs);

	&:hover {
		background-color: var(--background--hover);
	}

	&:active,
	&[aria-expanded='true'],
	:global([aria-expanded='true']) & {
		background-color: var(--background--active);
	}
}

.selected {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-start;
	flex: 1;
	min-width: 0;
	gap: var(--spacing--2xs);
	overflow: hidden;
}

.selectedLabel {
	display: flex;
	align-items: baseline;
	flex: 1;
	min-width: 0;
	gap: var(--spacing--3xs);
	overflow: hidden;
	transform: translateY(1px);
}

.selectedLabel > :global(.pong-text) {
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.chevron {
	color: var(--text-color--subtler);
}

.icon {
	min-width: var(--spacing--sm);
	min-height: var(--spacing--sm);
}

.infoIcon {
	flex-shrink: 0;
	margin-inline: var(--spacing--5xs);
}

.connected,
.restricted {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
	white-space: nowrap;
}

.restricted {
	padding-left: var(--spacing--md);
}

.connectedIcon {
	color: var(--color--success);
}

.emoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}

.flattenedLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	overflow: hidden;
	flex-grow: 1;
	white-space: nowrap;
}

.separator {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
}

.labelWithBadge {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.labelWithBadge > :global(.pong-text) {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.badge {
	flex-shrink: 0;
}

.credsBadge {
	flex-shrink: 0;
	transform: translateY(-1px);
}

.loading {
	flex-shrink: 0;
	align-self: center;
	width: calc(var(--height--3xl) * 2);
	/** TODO (DS-339): PongBadge doesnt have fixed height. This means height diff for loading skeleton causes layout jank. Remove the calc() when heights are added and matched in PongBadge **/
	height: calc(var(--height--2xs) - 2px);
	border-radius: var(--radius);
	background-color: var(--background--active);

	@include motion.skeleton-pulse;
}

.modelLoading {
	display: inline-block;
	flex-shrink: 0;
	width: calc(var(--height--3xl) * 2);
	height: var(--height--3xs);
	border-radius: var(--radius);
	background-color: var(--background--active);
	@include motion.skeleton-pulse;
}
</style>
