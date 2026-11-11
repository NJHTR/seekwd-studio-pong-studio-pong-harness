<script setup lang="ts">
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import type { OAuthClientResponseDto } from '@pong/api-types';
import { PongButton, PongIcon, PongSettingsRow, PongText, PongTimeAgo } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import type { BaseTextKey } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';

import { getAccessSummary, getClientBrand } from '../clients.utils';

/**
 * One of the current user's connected clients, previewed inline on the MCP
 * settings overview. The row opens the client's details; the hover-revealed
 * action starts the revoke flow.
 */
const props = defineProps<{
	client: OAuthClientResponseDto;
	/** Tool names each scope unlocks on this instance; decides when a grant reads as "Full access". */
	scopeTools?: Record<string, string[]>;
}>();

const emit = defineEmits<{
	click: [];
	revoke: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const brand = computed(() => getClientBrand(props.client.name));

const typeLabel = computed(() => {
	const type = brand.value.type;
	if (!type) return null;
	return i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}` as BaseTextKey);
});

const offeredScopes = computed(() =>
	props.scopeTools ? Object.keys(props.scopeTools) : undefined,
);

const accessSummary = computed(() => getAccessSummary(i18n, props.client, offeredScopes.value));

const grantedAt = computed(() => new Date(props.client.grantedAt).toISOString());

// One translatable phrase per shape ("IDE · Connected 2 minutes ago" / "Connected
// 2 minutes ago"), so locales own the separator and word order; the relative time
// is a component, hence slot interpolation rather than a string.
const metaKeypath = computed(() =>
	typeLabel.value
		? 'settings.mcp.connectedClients.preview.meta'
		: 'settings.mcp.connectedClients.preview.metaWithoutType',
);

const revokeLabel = computed(() =>
	i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccessFor', {
		interpolate: { name: props.client.name },
	}),
);
</script>

<template>
	<PongSettingsRow
		:title="client.name"
		show-visual
		clickable
		reveal-actions-on-hover
		data-test-id="mcp-client-preview-row"
		@click="emit('click')"
	>
		<template #visual>
			<span :class="$style.tile">
				<component :is="brand.icon" v-if="brand.icon" :class="$style.icon" />
				<PongIcon v-else icon="mcp" :class="$style.icon" />
			</span>
		</template>
		<template #info>
			<div :class="$style.info">
				<PongText
					bold
					size="medium"
					color="text-dark"
					:class="$style.line"
					data-test-id="mcp-client-preview-name"
				>
					{{ client.name }}
				</PongText>
				<PongText size="small" color="text-light" :class="$style.line">
					<I18nT :keypath="metaKeypath" scope="global" tag="span">
						<template v-if="typeLabel" #type>{{ typeLabel }}</template>
						<template #timeAgo
							><PongTimeAgo :date="grantedAt" :locale="rootStore.defaultLocale"
						/></template>
					</I18nT>
				</PongText>
				<PongText
					size="xsmall"
					color="text-light"
					:class="$style.line"
					data-test-id="mcp-client-preview-access"
				>
					{{ accessSummary }}
				</PongText>
			</div>
		</template>
		<template #action>
			<PongButton
				variant="outline"
				size="small"
				:label="i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccess')"
				:aria-label="revokeLabel"
				data-test-id="mcp-client-preview-revoke-button"
				@click="emit('revoke')"
			/>
		</template>
	</PongSettingsRow>
</template>

<style lang="scss" module>
/* Fills the row's bordered visual box. Fixed white so dark brand marks stay visible on the dark theme. */
.tile {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background-color: var(--color--neutral-white);
}

.icon {
	width: var(--spacing--md);
	height: var(--spacing--md);
	/* the tile is always white, so the fallback MCP glyph must stay dark in both themes */
	color: var(--color--neutral-black);
}

/* Mirrors the row's own title/description stack so the extra access line slots in beneath them. */
.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.line {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
