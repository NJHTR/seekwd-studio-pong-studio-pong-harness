<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@pong/i18n';
import { capabilities, capabilityRegistry } from '@pong/frontend-module-sdk';
import { ElSwitch } from 'element-plus';
import type { OAuthClientResponseDto } from '@pong/api-types';
import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogClose,
	PongDialogDescription,
	PongDialogFooter,
	PongNotice,
	PongSettingsLayout,
	PongSettingsPageHeader,
	PongSettingsRow,
	PongSettingsRowConfigure,
	PongSettingsRowGroup,
	PongSettingsSection,
} from '@pong/design-system';

import { useDocumentTitle } from '@pong/composables/useDocumentTitle';
import { useToast } from '@pong/composables/useToast';
import MCPEmptyState from './components/MCPEmptyState.vue';
import McpAllowedCallbackUrlsDialog from './components/McpAllowedCallbackUrlsDialog.vue';
import McpConnectClientDialog from './components/McpConnectClientDialog.vue';
import McpConnectedClientRow from './components/McpConnectedClientRow.vue';
import McpStatusControl from './components/McpStatusControl.vue';
import OAuthClientDetailsModal from './components/OAuthClientDetailsModal.vue';
import RevokeOAuthClientConfirmModal from './components/RevokeOAuthClientConfirmModal.vue';
import { useMcp } from './composables/useMcp';
import { useOAuthClientRevoke } from './composables/useOAuthClientRevoke';
import {
	MCP_AGENTS_VIEW,
	MCP_CLIENTS_VIEW,
	MCP_DOCS_PAGE_URL,
	MCP_WORKFLOWS_VIEW,
	UNKNOWN_COUNT_VALUE,
} from './mcp.constants';
import { useMCPStore } from './mcp.store';
import { useSettingsStore } from '@pong/stores/settings.store';
import { useRBACStore } from '@pong/stores/rbac.store';

const i18n = useI18n();
// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
const discoverySettings = capabilityRegistry.tryUse(capabilities.mcpDiscoverySettings);
const discoveryOverrides = computed(() => discoverySettings?.overrides());
const connectHintDismissed = ref(false);
// EOF Experiment cleanup
const toast = useToast();
const documentTitle = useDocumentTitle({
	releaseChannel: useSettingsStore().settings.releaseChannel,
});
const mcp = useMcp();
const router = useRouter();

const mcpStore = useMCPStore();
const settingsStore = useSettingsStore();
const rbacStore = useRBACStore();
const exposeAllOffer = capabilityRegistry.tryUse(capabilities.mcpExposeAllOffer);
const isExposeAllOfferEnabled = computed(() => exposeAllOffer?.isEnabled() ?? false);

const agentsEnabled = computed(() => settingsStore.isAgentsEnabled);

const mcpStatusLoading = ref(false);
const showDisableDialog = ref(false);
const isLoadingClients = ref(true);

const canManageMcpInstance = computed(() => rbacStore.hasScope('mcp:manage'));
const canToggleMCP = computed(() => canManageMcpInstance.value && !mcpStore.mcpManagedByEnv);

const exposedWorkflowsCount = ref<number | null>(null);
const autoExposeSaving = ref(false);
const showCallbackUrlsDialog = ref(false);
const savingCallbackUrls = ref(false);

const onAutoExposeSwitchUpdate = (value: string | number | boolean) => {
	void onToggleAutoExpose(value === true);
};

const onToggleAutoExpose = async (value: boolean) => {
	autoExposeSaving.value = true;
	try {
		const updated = await mcpStore.setAutoExposeNewWorkflows(value);
		mcp.trackAutoExposeToggled({ enabled: updated, source: 'settings' });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.autoExpose.error.title'));
	} finally {
		autoExposeSaving.value = false;
	}
};

const showInstanceCapacityNotice = computed(
	() => canManageMcpInstance.value && mcpStore.instanceClientStats?.atCapacity === true,
);

const instanceCapacityNoticeContent = computed(() => {
	const stats = mcpStore.instanceClientStats;
	if (!stats) return '';
	return i18n.baseText('settings.mcp.instanceCapacity.warning', {
		interpolate: { count: String(stats.count), limit: String(stats.limit) },
	});
});

const workflowsExposedValue = computed(() =>
	exposedWorkflowsCount.value === null
		? UNKNOWN_COUNT_VALUE
		: i18n.baseText('settings.mcp.workflowsExposed.count', {
				adjustToNumber: exposedWorkflowsCount.value,
				interpolate: { count: String(exposedWorkflowsCount.value) },
			}),
);

const exposedAgentsCount = ref<number | null>(null);

const agentsExposedValue = computed(() =>
	exposedAgentsCount.value === null
		? UNKNOWN_COUNT_VALUE
		: i18n.baseText('settings.mcp.agentsExposed.count', {
				adjustToNumber: exposedAgentsCount.value,
				interpolate: { count: String(exposedAgentsCount.value) },
			}),
);

const callbackUrlsValue = computed(() =>
	mcpStore.allowedRedirectUris.length === 0
		? i18n.baseText('settings.mcp.callbackUrls.value.all')
		: i18n.baseText('settings.mcp.callbackUrls.value.count', {
				adjustToNumber: mcpStore.allowedRedirectUris.length,
				interpolate: { count: String(mcpStore.allowedRedirectUris.length) },
			}),
);

const fetchExposedWorkflowsCount = async () => {
	try {
		const response = await mcpStore.fetchWorkflowsAvailableForMCP(1, 1);
		exposedWorkflowsCount.value = response.count;
	} catch (error) {
		toast.showError(error, i18n.baseText('workflows.list.error.fetching'));
	}
};

const fetchExposedAgentsCount = async () => {
	if (!agentsEnabled.value) return;
	try {
		const response = await mcpStore.fetchAgentsAvailableForMCP(1, 1);
		exposedAgentsCount.value = response.count;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.agents.list.error.fetching'));
	}
};

const onToggleMCPAccess = async (enabled: boolean) => {
	try {
		mcpStatusLoading.value = true;
		const updated = await mcpStore.setMcpAccessEnabled(enabled);
		if (updated) {
			await Promise.all([
				fetchExposedWorkflowsCount(),
				fetchExposedAgentsCount(),
				fetchConnectedClientsPreview(),
			]);
		}
		mcp.trackUserToggledMcpAccess(enabled);
		if (enabled && updated) {
			// Best-effort expose-all offer for enrolled users; enabling MCP no longer
			// auto-opens the connect dialog (the user connects a client when ready).
			void exposeAllOffer?.offer(async () => {
				await Promise.all([fetchExposedWorkflowsCount(), fetchExposedAgentsCount()]);
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.toggle.error'));
	} finally {
		mcpStatusLoading.value = false;
	}
};

const onConfirmDisable = async () => {
	showDisableDialog.value = false;
	await onToggleMCPAccess(false);
};

/**
 * Loads the user's own first clients for the inline preview, along with the
 * totals the "N clients have access" count renders. Only the user's own clients
 * are previewed here; other users' clients stay behind the clients page, which
 * gates them by permission.
 */
const fetchConnectedClientsPreview = async () => {
	isLoadingClients.value = true;
	try {
		await mcpStore.fetchOAuthClientsPreview();
		isLoadingClients.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.error.fetching.oAuthClients'));
	}
};

const previewClients = computed(() => mcpStore.oauthClientsPreview);

/** Instance-wide count when the user can see it, own count otherwise. */
const connectedClientsTotal = computed(
	() => mcpStore.oauthClientTotals.all ?? mcpStore.oauthClientTotals.mine,
);

// The "View all" row is the section's only content while clients load or when the
// user has none. Next to a preview it only earns its place when more clients exist
// than the preview shows (more of the user's own, or other users' for managers).
const showViewAllRow = computed(
	() =>
		previewClients.value.length === 0 || connectedClientsTotal.value > previewClients.value.length,
);

const onConnectClient = () => {
	mcp.trackConnectClientClicked('settings');
	mcpStore.openConnectPopover();
};

const openClientsView = () => {
	// The preview is the user's own clients, so "View all" continues into that list.
	// With none of their own to land on, a manager goes straight to everyone's.
	const { mine, all } = mcpStore.oauthClientTotals;
	const tab = mine === 0 && (all ?? 0) > 0 ? 'all' : 'mine';
	void router.push({ name: MCP_CLIENTS_VIEW, query: { tab } });
};

const detailsClient = ref<OAuthClientResponseDto | null>(null);
const detailsOpen = ref(false);

const openClientDetails = (client: OAuthClientResponseDto) => {
	detailsClient.value = client;
	detailsOpen.value = true;
};

const { revokeClient, revoking, isRevokingForOther, requestRevoke, cancelRevoke, confirmRevoke } =
	useOAuthClientRevoke({ refreshList: false, onRevoked: fetchConnectedClientsPreview });

const openWorkflowsView = () => {
	void router.push({ name: MCP_WORKFLOWS_VIEW });
};

const openAgentsView = () => {
	void router.push({ name: MCP_AGENTS_VIEW });
};

const loadRedirectUris = async () => {
	try {
		await mcpStore.fetchAllowedRedirectUris();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.allowedRedirectUris.error.loading'));
	}
};

const onSaveCallbackUrls = async (uris: string[]) => {
	try {
		savingCallbackUrls.value = true;
		await mcpStore.setAllowedRedirectUris(uris);
		showCallbackUrlsDialog.value = false;
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.mcp.allowedRedirectUris.success'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.allowedRedirectUris.error.saving'));
	} finally {
		savingCallbackUrls.value = false;
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.mcp'));
	if (!mcpStore.mcpAccessEnabled) {
		return;
	}
	const fetches: Array<Promise<unknown>> = [
		fetchExposedWorkflowsCount(),
		fetchExposedAgentsCount(),
		fetchConnectedClientsPreview(),
	];
	if (canManageMcpInstance.value) {
		fetches.push(loadRedirectUris());
		fetches.push(mcpStore.getInstanceClientStats());
	}
	await Promise.all(fetches);
});

// The preview is per-user data; don't let it outlive the page (a soft-redirect
// logout keeps the store), so the next visit starts from the loading state.
onBeforeUnmount(() => {
	mcpStore.clearOAuthClientsPreview();
});
</script>

<template>
	<PongSettingsLayout :class="$style.layout">
		<!-- Experiment cleanup (123_surface_mcp_to_claude_trial_users): keep the header; use the description fallback and remove docs-leading-text. Keep the translated docs-label. -->
		<PongSettingsPageHeader
			:title="i18n.baseText('settings.mcp.page.title')"
			:description="
				discoveryOverrides?.description ?? i18n.baseText('settings.mcp.page.description')
			"
			:docs-leading-text="discoveryOverrides?.docsLeadingText"
			:docs-url="MCP_DOCS_PAGE_URL"
			:docs-label="i18n.baseText('settings.mcp.page.docsLabel')"
			data-test-id="mcp-settings-header"
		/>

		<MCPEmptyState
			v-if="!mcpStore.mcpAccessEnabled"
			:disabled="!canToggleMCP"
			:loading="mcpStatusLoading"
			:managed-by-env="mcpStore.mcpManagedByEnv"
			@turn-on-mcp="onToggleMCPAccess(true)"
		/>

		<template v-else>
			<PongNotice
				v-if="showInstanceCapacityNotice"
				theme="warning"
				data-test-id="mcp-instance-capacity-notice"
				:content="instanceCapacityNoticeContent"
			/>

			<PongSettingsSection
				:title="i18n.baseText('settings.mcp.connectionDetails.title')"
				data-test-id="mcp-enabled-section"
			>
				<PongSettingsRowGroup>
					<PongSettingsRow
						:title="i18n.baseText('settings.mcp.status.title')"
						:description="i18n.baseText('settings.mcp.status.description')"
					>
						<template #action>
							<McpStatusControl
								:disabled="!canToggleMCP"
								:loading="mcpStatusLoading"
								:managed-by-env="mcpStore.mcpManagedByEnv"
								@disable="showDisableDialog = true"
							/>
						</template>
					</PongSettingsRow>
					<!-- Experiment cleanup (123_surface_mcp_to_claude_trial_users): keep the row and button; use title/description fallbacks, unwrap connectHint, and restore variant="outline". -->
					<PongSettingsRow
						:title="
							discoveryOverrides?.clientTitle ?? i18n.baseText('settings.mcp.yourClient.title')
						"
						:description="
							discoveryOverrides?.clientDescription ??
							i18n.baseText('settings.mcp.yourClient.description')
						"
					>
						<template #action>
							<component
								:is="discoverySettings?.connectHint ?? 'span'"
								v-model:dismissed="connectHintDismissed"
							>
								<PongButton
									:variant="discoveryOverrides?.connectVariant ?? 'outline'"
									size="medium"
									icon="mcp"
									:label="i18n.baseText('settings.mcp.yourClient.connect')"
									data-test-id="mcp-connect-client-button"
									@click="onConnectClient"
								/>
							</component>
						</template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</PongSettingsSection>

			<PongSettingsSection :title="i18n.baseText('settings.mcp.access.title')">
				<PongSettingsRowGroup>
					<PongSettingsRow
						:title="i18n.baseText('settings.mcp.workflowsExposed.title')"
						:description="i18n.baseText('settings.mcp.workflowsExposed.description')"
						clickable
						data-test-id="mcp-workflows-exposed-row"
						@click="openWorkflowsView"
					>
						<template #action>
							<PongSettingsRowConfigure :value="workflowsExposedValue" />
						</template>
					</PongSettingsRow>
					<PongSettingsRow
						v-if="canManageMcpInstance && isExposeAllOfferEnabled"
						:title="i18n.baseText('settings.mcp.autoExpose.title')"
						:description="i18n.baseText('settings.mcp.autoExpose.description')"
					>
						<template #action>
							<ElSwitch
								data-test-id="mcp-auto-expose-toggle"
								:model-value="mcpStore.autoExposeNewWorkflows"
								:disabled="mcpStore.mcpManagedByEnv"
								:loading="autoExposeSaving"
								@update:model-value="onAutoExposeSwitchUpdate"
							/>
						</template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
				<PongSettingsRowGroup v-if="agentsEnabled">
					<PongSettingsRow
						:title="i18n.baseText('settings.mcp.agentsExposed.title')"
						:description="i18n.baseText('settings.mcp.agentsExposed.description')"
						clickable
						data-test-id="mcp-agents-exposed-row"
						@click="openAgentsView"
					>
						<template #action>
							<PongSettingsRowConfigure :value="agentsExposedValue" />
						</template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
				<PongSettingsRowGroup v-if="canManageMcpInstance">
					<PongSettingsRow
						:title="i18n.baseText('settings.mcp.callbackUrls.title')"
						:description="i18n.baseText('settings.mcp.callbackUrls.description')"
						clickable
						data-test-id="mcp-callback-urls-row"
						@click="showCallbackUrlsDialog = true"
					>
						<template #action>
							<PongSettingsRowConfigure :value="callbackUrlsValue" />
						</template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</PongSettingsSection>

			<PongSettingsSection :title="i18n.baseText('settings.mcp.connectedClients.title')">
				<PongSettingsRowGroup v-if="previewClients.length > 0" data-test-id="mcp-clients-preview">
					<McpConnectedClientRow
						v-for="client in previewClients"
						:key="client.id"
						:client="client"
						:scope-tools="mcpStore.oauthClientScopeTools"
						@click="openClientDetails(client)"
						@revoke="requestRevoke(client)"
					/>
				</PongSettingsRowGroup>
				<PongSettingsRowGroup v-if="showViewAllRow">
					<PongSettingsRow
						:title="i18n.baseText('settings.mcp.connectedClients.viewAll.title')"
						:description="
							isLoadingClients
								? UNKNOWN_COUNT_VALUE
								: i18n.baseText('settings.mcp.connectedClients.viewAll.description', {
										adjustToNumber: connectedClientsTotal,
										interpolate: { count: String(connectedClientsTotal) },
									})
						"
						clickable
						data-test-id="mcp-clients-view-all-row"
						@click="openClientsView"
					>
						<template #action>
							<PongSettingsRowConfigure
								:value="i18n.baseText('settings.mcp.connectedClients.viewAll.action')"
							/>
						</template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</PongSettingsSection>
		</template>

		<PongDialog
			v-model:open="showDisableDialog"
			size="small"
			:header="i18n.baseText('settings.mcp.status.disableDialog.title')"
			data-test-id="mcp-disable-dialog"
		>
			<PongDialogBody>
				<PongDialogDescription>
					{{ i18n.baseText('settings.mcp.status.disableDialog.description') }}
				</PongDialogDescription>
			</PongDialogBody>
			<PongDialogFooter>
				<PongDialogClose as-child>
					<PongButton variant="outline" :label="i18n.baseText('generic.cancel')" />
				</PongDialogClose>
				<PongButton
					variant="destructive"
					:label="i18n.baseText('settings.mcp.status.disableDialog.confirm')"
					data-test-id="mcp-disable-dialog-confirm"
					@click="onConfirmDisable"
				/>
			</PongDialogFooter>
		</PongDialog>

		<McpConnectClientDialog />

		<OAuthClientDetailsModal
			v-model:open="detailsOpen"
			:client="detailsClient"
			@revoke="requestRevoke"
		/>

		<RevokeOAuthClientConfirmModal
			:client="revokeClient"
			:open="!!revokeClient"
			:loading="revoking"
			:revoking-for-other="!!revokeClient && isRevokingForOther(revokeClient)"
			@confirm="confirmRevoke"
			@cancel="cancelRevoke"
			@update:open="cancelRevoke"
		/>

		<McpAllowedCallbackUrlsDialog
			v-model:open="showCallbackUrlsDialog"
			:uris="mcpStore.allowedRedirectUris"
			:saving="savingCallbackUrls"
			@save="onSaveCallbackUrls"
		/>
	</PongSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}
</style>
