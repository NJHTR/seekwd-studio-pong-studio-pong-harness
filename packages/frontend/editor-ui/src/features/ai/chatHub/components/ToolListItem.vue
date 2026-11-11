<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { getNodeItemRestriction } from '@/features/shared/nodeCreator/nodeCreator.utils';
import { PongButton, PongIcon, PongIconButton, PongText, PongTooltip } from '@pong/design-system';
import { RestrictedNodePopover } from '@pong/frontend-module-type-availability-policies';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@pong/i18n';
import type { INode, INodeTypeDescription } from 'pong-workflow';
import { computed, ref } from 'vue';

const props = defineProps<{
	nodeType: INodeTypeDescription;
	configuredNode?: INode;
	enabled?: boolean;
	mode: 'configured' | 'available';
	/** Uninstalled verified community preview — show Install CTA + verified badge. */
	communityPreview?: boolean;
	installing?: boolean;
	/** Non-admin cannot install; button is disabled with contact-admin tooltip. */
	installDisabled?: boolean;
	/** The user's role cannot use this tool type, so only removal is possible. */
	roleBlocked?: boolean;
}>();

const emit = defineEmits<{
	toggle: [enabled: boolean];
	configure: [];
	remove: [];
	add: [];
}>();

const i18n = useI18n();

const description = computed(() => {
	if (props.configuredNode && props.configuredNode.name !== props.nodeType.displayName) {
		return props.nodeType.displayName;
	}
	return props.nodeType.description;
});

const displayName = computed(() => {
	if (props.configuredNode) {
		return props.configuredNode.name;
	}
	return props.nodeType.displayName;
});

const actionLabel = computed(() =>
	props.communityPreview
		? i18n.baseText('communityNodeDetails.install')
		: i18n.baseText('chatHub.toolsManager.add'),
);

const actionDisabled = computed(
	() => props.communityPreview && (props.installing || props.installDisabled),
);

const rowRef = ref<HTMLElement | null>(null);
const restriction = computed(() => getNodeItemRestriction(props.nodeType.name));
</script>

<template>
	<div
		ref="rowRef"
		:class="[
			$style.item,
			{
				[$style.configured]: mode === 'configured',
				[$style.restricted]: !!restriction || roleBlocked,
			},
		]"
	>
		<div :class="$style.iconWrapper">
			<NodeIcon :node-type="nodeType" :size="32" />
		</div>

		<div :class="$style.content">
			<div :class="$style.nameRow">
				<PongText :class="$style.name" size="small" color="text-dark">
					{{ displayName }}
				</PongText>
				<PongTooltip
					v-if="communityPreview"
					:content="i18n.baseText('communityNodeInfo.approved')"
					placement="top"
				>
					<PongIcon
						icon="shield-half"
						:size="12"
						:class="$style.verifiedIcon"
						:aria-label="i18n.baseText('communityNodeInfo.approved')"
						data-test-id="chat-tool-verified-badge"
					/>
				</PongTooltip>
			</div>
			<PongText :class="$style.description" size="small" color="text-light">
				{{ description }}
			</PongText>
		</div>

		<div :class="$style.actions">
			<RestrictedNodePopover
				v-if="restriction"
				:node-type-name="nodeType.displayName"
				:restriction="restriction"
				:anchor="rowRef"
			/>

			<PongTooltip
				v-if="roleBlocked"
				:content="i18n.baseText('chatHub.toolsManager.roleBlocked')"
				placement="top"
			>
				<span
					:class="$style.marker"
					tabindex="0"
					role="img"
					:aria-label="i18n.baseText('chatHub.toolsManager.roleBlocked')"
				>
					<PongIcon icon="lock" size="small" data-test-id="chat-tool-role-blocked-icon" />
				</span>
			</PongTooltip>

			<template v-if="mode === 'configured'">
				<PongTooltip v-if="!roleBlocked" :content="i18n.baseText('chatHub.toolsManager.configure')">
					<PongIconButton
						icon="settings"
						variant="ghost"
						text
						:class="$style.actionButton"
						@click="emit('configure')"
					/>
				</PongTooltip>

				<PongTooltip :content="i18n.baseText('chatHub.toolsManager.remove')">
					<PongIconButton
						icon="trash-2"
						variant="ghost"
						text
						:class="$style.actionButton"
						@click="emit('remove')"
					/>
				</PongTooltip>

				<PongTooltip
					v-if="!roleBlocked"
					:content="
						enabled
							? i18n.baseText('chatHub.toolsManager.disableTool')
							: i18n.baseText('chatHub.toolsManager.enableTool')
					"
				>
					<ElSwitch
						:model-value="enabled"
						:class="$style.toggle"
						@update:model-value="emit('toggle', Boolean($event))"
					/>
				</PongTooltip>
			</template>

			<template v-else-if="!restriction">
				<PongTooltip
					v-if="communityPreview && installDisabled && !installing"
					:content="i18n.baseText('communityNodeInfo.contact.admin')"
					placement="top"
				>
					<span>
						<PongButton
							variant="outline"
							size="small"
							icon="plus"
							:loading="installing"
							:disabled="true"
							data-test-id="chat-tool-install-button"
						>
							{{ actionLabel }}
						</PongButton>
					</span>
				</PongTooltip>
				<PongButton
					v-else
					variant="outline"
					size="small"
					icon="plus"
					:loading="installing"
					:disabled="actionDisabled"
					:data-test-id="communityPreview ? 'chat-tool-install-button' : 'chat-tool-add-button'"
					@click="emit('add')"
				>
					{{ actionLabel }}
				</PongButton>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
	border-radius: var(--radius--lg);

	&.configured {
		.actionButton {
			opacity: 0;
		}

		&:hover {
			.actionButton {
				opacity: 1;
			}
		}
	}
}

.restricted {
	cursor: not-allowed;

	.iconWrapper,
	.content {
		opacity: 0.45;
	}
}

// Matches the lock marker of the availability policy popover.
.marker {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--3xs);
	color: var(--color--text--tint-1);

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
	}
}

.iconWrapper {
	flex-shrink: 0;
	width: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.nameRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.verifiedIcon {
	flex-shrink: 0;
	vertical-align: middle;
	color: var(--color--success);
}

.name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.description {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.toggle {
	margin-left: var(--spacing--2xs);
}
</style>
