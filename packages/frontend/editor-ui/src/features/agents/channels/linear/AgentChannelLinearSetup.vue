<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { PongButton, PongIconButton, PongInput, PongStepper, PongText } from '@pong/design-system';
import type { ChatIntegrationDescriptor, AgentIntegrationSettings } from '@pong/api-types';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import type { PermissionsRecord } from '@pong/permissions';
import { TIME } from '@/app/constants';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';

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
		connectedDescription?: string;
		errorMessage?: string;
		errorIsConflict?: boolean;
		savedSettings?: AgentIntegrationSettings;
		agentName: string;
		projectId: string;
		agentId: string;
		forceNewCredential?: boolean;
	}>(),
	{
		credentialsLoading: false,
		loading: false,
		connected: false,
		connectedDescription: '',
		errorMessage: '',
		errorIsConflict: false,
		savedSettings: undefined,
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
const copiedField = shallowRef<'oauthCallback' | 'webhook' | null>(null);

const LINEAR_APP_SETUP_URL = 'https://linear.app/settings/api/applications/new';

const steps = computed(() => [
	{
		id: 'create-oauth-application',
		title: i18n.baseText('agents.channels.linear.setup.createOAuthApplication.title'),
		description: i18n.baseText('agents.channels.linear.setup.createOAuthApplication.description'),
	},
	{
		id: 'configure-application',
		title: i18n.baseText('agents.channels.linear.setup.configureApplication.title'),
		description: i18n.baseText('agents.channels.linear.setup.configureApplication.description'),
	},
	{
		id: 'create-credential',
		title: i18n.baseText('agents.channels.linear.setup.createCredential.title'),
		description: i18n.baseText('agents.channels.linear.setup.createCredential.description'),
	},
]);

const canConnect = computed(
	() => credentialId.value.length > 0 && !props.loading && !validationError.value,
);

const webhookUrl = computed(() => {
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/linear`;
});

const oauthCallbackUrl = computed(
	() => (rootStore.OAuthCallbackUrls as { oauth2?: string } | undefined)?.oauth2 ?? '',
);

const currentSettings = computed(() => undefined);
const validationError = computed(() => null);

function urlFor(field: 'oauthCallback' | 'webhook'): string {
	return field === 'oauthCallback' ? oauthCallbackUrl.value : webhookUrl.value;
}

async function copyUrl(field: 'oauthCallback' | 'webhook') {
	await navigator.clipboard.writeText(urlFor(field));
	copiedField.value = field;
	setTimeout(() => {
		if (copiedField.value === field) {
			copiedField.value = null;
		}
	}, 2 * TIME.SECOND);
}

function copyLabel(field: 'oauthCallback' | 'webhook'): string {
	return copiedField.value === field
		? i18n.baseText('agents.builder.addTrigger.copied')
		: i18n.baseText('agents.builder.addTrigger.copy');
}

function selectUrlInput(event: FocusEvent) {
	if (event.target instanceof HTMLInputElement) {
		event.target.select();
	}
}

defineExpose({ credentialId, currentSettings, validationError });
</script>

<template>
	<div :class="$style.linearSetup">
		<PongStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<PongButton
						v-if="step.id === 'create-oauth-application'"
						:href="LINEAR_APP_SETUP_URL"
						target="_blank"
						variant="outline"
						size="medium"
						icon="linear"
						data-testid="linear-app-setup-link"
					>
						{{ i18n.baseText('agents.channels.linear.setup.createOAuthApplication.button') }}
					</PongButton>

					<div v-else-if="step.id === 'configure-application'" :class="$style.linearAppSetup">
						<div :class="$style.urlField">
							<label for="linear-oauth-callback-url" :class="$style.urlLabel">
								<PongText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.linear.oauthCallbackUrl.label') }}
								</PongText>
							</label>
							<PongInput
								id="linear-oauth-callback-url"
								:model-value="oauthCallbackUrl"
								size="large"
								readonly
								:class="$style.urlInput"
								data-testid="linear-oauth-callback-url"
								@focus="selectUrlInput"
							>
								<template #suffix>
									<PongIconButton
										:icon="copiedField === 'oauthCallback' ? 'check' : 'copy'"
										variant="ghost"
										size="small"
										:class="$style.copyButton"
										:title="copyLabel('oauthCallback')"
										:aria-label="copyLabel('oauthCallback')"
										data-testid="linear-copy-oauth-callback-url"
										@click.stop="copyUrl('oauthCallback')"
									/>
								</template>
							</PongInput>
						</div>

						<div :class="$style.urlField">
							<label for="linear-webhook-url" :class="$style.urlLabel">
								<PongText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.linear.webhookUrl.label') }}
								</PongText>
							</label>
							<PongInput
								id="linear-webhook-url"
								:model-value="webhookUrl"
								size="large"
								readonly
								:class="$style.urlInput"
								data-testid="linear-webhook-url"
								@focus="selectUrlInput"
							>
								<template #suffix>
									<PongIconButton
										:icon="copiedField === 'webhook' ? 'check' : 'copy'"
										variant="ghost"
										size="small"
										:class="$style.copyButton"
										:title="copyLabel('webhook')"
										:aria-label="copyLabel('webhook')"
										data-testid="linear-copy-webhook-url"
										@click.stop="copyUrl('webhook')"
									/>
								</template>
							</PongInput>
							<PongText :class="$style.urlHint" size="small">
								{{ i18n.baseText('agents.channels.linear.setup.configureApplication.webhookHint') }}
							</PongText>
						</div>
					</div>
					<div v-else-if="step.id === 'create-credential'" :class="$style.credentialStep">
						<AgentIntegrationCredentialConnection
							v-if="!connected"
							v-model="credentialId"
							:integration-type="integration.type"
							:integration-label="integration.label"
							:credentials="credentials"
							:credential-permissions="credentialPermissions"
							:credentials-loading="credentialsLoading"
							:disabled="loading"
							:force-new-credential="forceNewCredential"
							:class="$style.cred"
							@create="emit('create')"
							@edit="emit('edit')"
						/>
						<PongButton
							variant="outline"
							size="medium"
							:loading="loading"
							:disabled="!canConnect"
							data-testid="linear-connect-button"
							@click="emit('connect')"
						>
							{{ i18n.baseText('generic.connect') }}
						</PongButton>
					</div>
				</div>
			</template>
		</PongStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.linearAppSetup">
				<PongText size="small" bold>
					{{ i18n.baseText('agents.builder.addTrigger.linear.setup.title') }}
				</PongText>
				<PongText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.addTrigger.linear.setup.description') }}
					<a
						:href="LINEAR_APP_SETUP_URL"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.link"
						data-testid="linear-app-setup-link"
					>
						{{ i18n.baseText('agents.builder.addTrigger.linear.setup.link') }}
					</a>
				</PongText>

				<div :class="$style.urlField">
					<label for="linear-oauth-callback-url" :class="$style.urlLabel">
						<PongText size="small" bold>
							{{ i18n.baseText('agents.builder.addTrigger.linear.oauthCallbackUrl.label') }}
						</PongText>
					</label>
					<PongInput
						id="linear-oauth-callback-url"
						:model-value="oauthCallbackUrl"
						size="small"
						readonly
						:class="$style.urlInput"
						data-testid="linear-oauth-callback-url"
						@focus="selectUrlInput"
					>
						<template #suffix>
							<PongIconButton
								:icon="copiedField === 'oauthCallback' ? 'check' : 'copy'"
								variant="ghost"
								size="small"
								:title="copyLabel('oauthCallback')"
								:aria-label="copyLabel('oauthCallback')"
								data-testid="linear-copy-oauth-callback-url"
								@click.stop="copyUrl('oauthCallback')"
							/>
						</template>
					</PongInput>
				</div>

				<div :class="$style.urlField">
					<label for="linear-webhook-url" :class="$style.urlLabel">
						<PongText size="small" bold>
							{{ i18n.baseText('agents.builder.addTrigger.linear.webhookUrl.label') }}
						</PongText>
					</label>
					<PongInput
						id="linear-webhook-url"
						:model-value="webhookUrl"
						size="small"
						readonly
						:class="$style.urlInput"
						data-testid="linear-webhook-url"
						@focus="selectUrlInput"
					>
						<template #suffix>
							<PongIconButton
								:icon="copiedField === 'webhook' ? 'check' : 'copy'"
								variant="ghost"
								size="small"
								:title="copyLabel('webhook')"
								:aria-label="copyLabel('webhook')"
								data-testid="linear-copy-webhook-url"
								@click.stop="copyUrl('webhook')"
							/>
						</template>
					</PongInput>
					<PongText :class="$style.urlHint" size="small">
						{{ i18n.baseText('agents.channels.linear.setup.configureApplication.webhookHint') }}
					</PongText>
				</div>
			</div>
			<AgentIntegrationCredentialConnection
				v-if="!connected"
				v-model="credentialId"
				:integration-type="integration.type"
				:integration-label="integration.label"
				:credentials="credentials"
				:credential-permissions="credentialPermissions"
				:credentials-loading="credentialsLoading"
				:disabled="loading"
				@create="emit('create')"
				@edit="emit('edit')"
			/>
			<PongText v-else-if="connectedDescription" size="small">{{ connectedDescription }}</PongText>
		</div>

		<PongText v-if="errorMessage" :class="$style.errorText" size="small">
			{{ errorMessage }}
			<a
				v-if="credentialId && !errorIsConflict"
				:class="$style.link"
				href="#"
				@click.prevent="emit('edit')"
			>
				{{ i18n.baseText('agents.builder.addTrigger.editCredential') }}
			</a>
		</PongText>
	</div>
</template>

<style module lang="scss">
.linearSetup,
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

.linearAppSetup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.urlField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.urlLabel {
	display: block;
}

.urlHint {
	color: var(--text-color--subtler);
}

.credentialStep {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
	width: 100%;
}

.cred {
	width: 100%;
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

.errorText {
	color: var(--color--danger);
}

.link {
	color: var(--color--primary);
	text-decoration: underline;
	cursor: pointer;
	margin-left: var(--spacing--4xs);
}
.copyButton {
	margin-right: calc(var(--spacing--3xs) * -1);
}
</style>
