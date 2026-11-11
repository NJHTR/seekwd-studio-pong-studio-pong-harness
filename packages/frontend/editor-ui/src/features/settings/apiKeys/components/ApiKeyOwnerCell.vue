<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@pong/i18n';
import type { ApiKeyOwner } from '@pong/api-types';
import { PongAvatar, PongText } from '@pong/design-system';

import { getApiKeyOwnerDisplayName } from '../apiKeys.utils';

const props = defineProps<{
	owner: ApiKeyOwner;
	isCurrentUser?: boolean;
}>();

const i18n = useI18n();

const displayName = computed(() => getApiKeyOwnerDisplayName(props.owner));
</script>

<template>
	<div :class="$style.cell" data-test-id="api-key-owner-cell">
		<PongAvatar
			:first-name="owner.firstName ?? ''"
			:last-name="owner.lastName ?? ''"
			size="xsmall"
			:class="$style.avatar"
		/>
		<div :class="$style.info">
			<PongText size="small" color="text-dark" :class="$style.name">
				{{ displayName }}
				<!-- text-base: subtler than the name but the lightest DS text color
				     that still passes WCAG AA contrast on the row background. -->
				<PongText v-if="isCurrentUser" size="small" color="text-base">
					{{ i18n.baseText('settings.api.owners.you') }}
				</PongText>
			</PongText>
			<PongText size="xsmall" color="text-light" :class="$style.email" data-test-id="user-email">
				{{ owner.email }}
			</PongText>
		</div>
	</div>
</template>

<style lang="scss" module>
.cell {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.avatar {
	flex-shrink: 0;
}

.info {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.name,
.email {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
