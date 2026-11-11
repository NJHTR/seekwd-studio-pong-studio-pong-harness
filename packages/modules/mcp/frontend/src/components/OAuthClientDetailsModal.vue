<script setup lang="ts">
import { computed } from 'vue';

import type { OAuthClientResponseDto } from '@pong/api-types';
import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogDescription,
	PongDialogFooter,
	PongDialogHeader,
	PongDialogTitle,
	PongIcon,
	PongText,
	PongTimeAgo,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import type { BaseTextKey } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';

import { getClientBrand, scopeLabel } from '../clients.utils';

const props = defineProps<{
	client: OAuthClientResponseDto | null;
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	revoke: [client: OAuthClientResponseDto];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const brand = computed(() => (props.client ? getClientBrand(props.client.name) : null));

const ownerLabel = computed(() => {
	const owner = props.client?.owner;
	if (!owner) return null;
	const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ');
	return name ? `${name} (${owner.email})` : owner.email;
});

const subtitle = computed(() => {
	const type = brand.value?.type;
	if (!type) return i18n.baseText('settings.mcp.oAuthClients.details.subtitle');
	return i18n.baseText('settings.mcp.oAuthClients.details.subtitleWithType', {
		interpolate: {
			type: i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}` as BaseTextKey),
		},
	});
});

/** Granted scopes as human labels, listed plainly in grant order. */
const grantedScopes = computed(() => props.client?.scopes ?? []);

function onRevoke() {
	if (!props.client) return;
	emit('revoke', props.client);
	emit('update:open', false);
}
</script>

<template>
	<PongDialog
		:open="open"
		size="medium"
		data-test-id="mcp-client-details-modal"
		@update:open="emit('update:open', $event)"
	>
		<template v-if="client">
			<PongDialogHeader>
				<PongDialogTitle>
					<span :class="$style.title">
						<span :class="$style['icon-chip']">
							<component :is="brand.icon" v-if="brand?.icon" :class="$style.icon" />
							<PongIcon v-else icon="mcp" :class="$style.icon" />
						</span>
						{{ client.name }}
					</span>
				</PongDialogTitle>
				<PongDialogDescription>{{ subtitle }}</PongDialogDescription>
			</PongDialogHeader>

			<PongDialogBody>
				<div :class="$style.details">
					<template v-if="ownerLabel">
						<PongText color="text-light" size="small">
							{{ i18n.baseText('settings.mcp.oAuthClients.details.connectedBy') }}
						</PongText>
						<PongText color="text-dark" size="small" data-test-id="mcp-client-details-connected-by">
							{{ ownerLabel }}
						</PongText>
					</template>

					<PongText color="text-light" size="small">
						{{ i18n.baseText('settings.mcp.oAuthClients.details.connectedOn') }}
					</PongText>
					<PongText color="text-dark" size="small" data-test-id="mcp-client-details-connected-on">
						<PongTimeAgo
							:date="new Date(client.grantedAt).toISOString()"
							capitalize
							:locale="rootStore.defaultLocale"
						/>
					</PongText>

					<PongText color="text-light" size="small">
						{{ i18n.baseText('settings.mcp.oAuthClients.details.access') }}
					</PongText>
					<div :class="$style.access" data-test-id="mcp-client-details-access">
						<PongText
							v-for="scope in grantedScopes"
							:key="scope"
							color="text-dark"
							size="small"
							:data-test-id="`mcp-client-details-scope-${scope}`"
						>
							{{ scopeLabel(i18n, scope) }}
						</PongText>
					</div>
				</div>
			</PongDialogBody>

			<PongDialogFooter>
				<PongButton
					variant="outline"
					data-test-id="mcp-client-details-close"
					@click="emit('update:open', false)"
				>
					{{ i18n.baseText('generic.close') }}
				</PongButton>
				<PongButton variant="destructive" data-test-id="mcp-client-details-revoke" @click="onRevoke">
					{{ i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccess') }}
				</PongButton>
			</PongDialogFooter>
		</template>
	</PongDialog>
</template>

<style lang="scss" module>
.title {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	flex-shrink: 0;
	/* fixed white tile so dark brand marks stay visible on the dark theme */
	background-color: var(--color--neutral-white);
	border: var(--border);
	border-radius: var(--radius);
}

.icon {
	width: var(--spacing--md);
	height: var(--spacing--md);
	/* the tile is always white, so the fallback MCP glyph must stay dark in both themes */
	color: var(--color--neutral-black);
}

.details {
	display: grid;
	grid-template-columns: minmax(120px, auto) 1fr;
	column-gap: var(--spacing--lg);
	row-gap: var(--spacing--xs);
	align-items: start;
	max-height: 60vh;
	overflow-y: auto;
}

.access {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}
</style>
