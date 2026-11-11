<script setup lang="ts">
import { computed } from 'vue';
import { PongButton, PongCopyInput, PongStepper, PongText } from '@pong/design-system';
import type { ChatIntegrationDescriptor } from '@pong/api-types';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import type { PermissionsRecord } from '@pong/permissions';
import AgentIntegrationCredentialConnection from './AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from './AgentCredentialSelect.vue';

const credentialId = defineModel<string>({ default: '' });

const props = withDefaults(
	defineProps<{
		mode: 'setup' | 'edit';
		integration: ChatIntegrationDescriptor;
		credentials: AgentCredentialOption[];
		credentialPermissions: PermissionsRecord['credential'];
		credentialsLoading?: boolean;
		loading?: boolean;
		connected?: boolean;
		isPublished?: boolean;
		errorMessage?: string;
		errorIsConflict?: boolean;
		projectId: string;
		agentId: string;
		forceNewCredential?: boolean;
	}>(),
	{
		credentialsLoading: false,
		loading: false,
		connected: false,
		isPublished: true,
		errorMessage: '',
		errorIsConflict: false,
		forceNewCredential: false,
	},
);

const emit = defineEmits<{
	create: [];
	edit: [];
	connect: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const DISCORD_APP_SETUP_URL = 'https://discord.com/developers/applications';

/**
 * Connecting comes last so it is the step that finishes the wizard, but the
 * interactions URL can only be *registered* in Discord afterwards: Discord
 * verifies it with a signed ping that pong can answer only once the credential
 * is connected. Step three therefore hands over the URL and says when to use
 * it, rather than asking the user to save it there and then.
 */
const steps = computed(() => [
	{
		id: 'create-application',
		title: i18n.baseText('agents.channels.discord.setup.createApplication.title'),
		description: i18n.baseText('agents.channels.discord.setup.createApplication.description'),
	},
	{
		id: 'create-bot',
		title: i18n.baseText('agents.channels.discord.setup.createBot.title'),
		description: i18n.baseText('agents.channels.discord.setup.createBot.description'),
	},
	{
		id: 'interactions-endpoint',
		title: i18n.baseText('agents.channels.discord.setup.interactionsEndpoint.title'),
		description: i18n.baseText('agents.channels.discord.setup.interactionsEndpoint.description'),
	},
	{
		id: 'create-credential',
		title: i18n.baseText('agents.channels.discord.setup.createCredential.title'),
		description: i18n.baseText('agents.channels.discord.setup.createCredential.description'),
	},
]);

const interactionsUrl = computed(() => {
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/discord`;
});

defineExpose({ credentialId, validationError: null });
</script>

<template>
	<div :class="$style.discordSetup">
		<PongStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<PongButton
						v-if="step.id === 'create-application'"
						:href="DISCORD_APP_SETUP_URL"
						target="_blank"
						variant="outline"
						size="medium"
						icon="discord"
						data-testid="discord-app-setup-link"
					>
						{{ i18n.baseText('agents.channels.discord.setup.createApplication.button') }}
					</PongButton>

					<PongText
						v-else-if="step.id === 'create-bot'"
						size="small"
						:class="$style.hint"
						data-testid="discord-bot-hint"
					>
						{{ i18n.baseText('agents.channels.discord.setup.createBot.hint') }}
					</PongText>

					<div v-else-if="step.id === 'interactions-endpoint'" :class="$style.urlField">
						<label for="discord-interactions-url">
							<PongText size="small" bold>
								{{ i18n.baseText('agents.builder.addTrigger.discord.interactionsUrl.label') }}
							</PongText>
						</label>
						<PongCopyInput
							id="discord-interactions-url"
							:value="interactionsUrl"
							:label="i18n.baseText('agents.builder.addTrigger.discord.interactionsUrl.label')"
							size="large"
							:class="$style.urlInput"
							:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
							:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
							data-testid="discord-interactions-url"
						/>
						<PongText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.discord.setup.interactionsEndpoint.hint') }}
						</PongText>
					</div>

					<div v-else-if="step.id === 'create-credential'">
						<AgentIntegrationCredentialConnection
							v-if="!connected"
							v-model="credentialId"
							:integration-type="integration.type"
							:integration-label="integration.label"
							:credentials="credentials"
							:credential-permissions="credentialPermissions"
							:credentials-loading="credentialsLoading"
							:disabled="loading"
							:loading="loading"
							:error-message="errorMessage"
							:error-is-conflict="errorIsConflict"
							:force-new-credential="forceNewCredential"
							show-connect-button
							@create="emit('create')"
							@edit="emit('edit')"
							@connect="emit('connect')"
						/>
						<PongText
							v-if="connected && !isPublished"
							:class="$style.hint"
							size="small"
							data-testid="discord-publish-notice"
						>
							{{ i18n.baseText('agents.channels.setup.publishNotice') }}
						</PongText>
					</div>
				</div>
			</template>
		</PongStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.urlField">
				<label for="discord-interactions-url">
					<PongText size="small" bold>
						{{ i18n.baseText('agents.builder.addTrigger.discord.interactionsUrl.label') }}
					</PongText>
				</label>
				<PongCopyInput
					id="discord-interactions-url"
					:value="interactionsUrl"
					:label="i18n.baseText('agents.builder.addTrigger.discord.interactionsUrl.label')"
					size="small"
					:class="$style.urlInput"
					:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
					:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
					data-testid="discord-interactions-url"
				/>
				<PongText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.discord.setup.interactionsEndpoint.hint') }}
				</PongText>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.discordSetup,
.formContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.stepContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--xs);
}

.urlField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.hint {
	color: var(--text-color--subtler);
}

.urlInput {
	flex: 1;
	min-width: 0;
}

.urlInput input {
	font-family: monospace;
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
}
</style>
