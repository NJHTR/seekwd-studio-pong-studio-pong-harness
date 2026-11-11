<script setup lang="ts">
import type { DynamicCredentialItem } from '@/features/ai/chatHub/composables/useDynamicCredentialsStatus';
import { useI18n } from '@pong/i18n';
import { PongButton, PongIconButton, PongText, PongSpinner } from '@pong/design-system';

defineProps<{
	credentials: DynamicCredentialItem[];
	connectedCount: number;
	totalCount: number;
}>();

const emit = defineEmits<{
	close: [];
	authorize: [credentialId: string];
	revoke: [credentialId: string];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.panel">
			<div :class="$style.header">
				<PongText bold size="large">{{
					i18n.baseText('chatHub.dynamicCredentials.drawer.title')
				}}</PongText>
				<PongIconButton
					type="tertiary"
					text
					icon="x"
					data-testid="dynamic-credentials-drawer-close"
					@click="emit('close')"
				/>
			</div>

			<div :class="$style.body">
				<div :class="$style.subtitle">
					<PongText bold>{{ i18n.baseText('chatHub.dynamicCredentials.drawer.subtitle') }}</PongText>
					<PongText size="small" color="text-light">{{
						i18n.baseText('chatHub.dynamicCredentials.drawer.description')
					}}</PongText>
				</div>

				<ul :class="$style.credentialList">
					<li
						v-for="cred in credentials"
						:key="cred.credentialId"
						:class="$style.credentialRow"
						data-testid="dynamic-credential-row"
					>
						<div :class="$style.credentialInfo">
							<PongText bold>{{ cred.credentialName }}</PongText>
							<PongText
								v-if="cred.credentialStatus === 'configured'"
								size="small"
								color="text-light"
							>
								{{ i18n.baseText('chatHub.dynamicCredentials.drawer.status.connected') }}
							</PongText>
							<PongText v-else size="small" color="text-light">
								{{ i18n.baseText('chatHub.dynamicCredentials.drawer.status.notConnected') }}
							</PongText>
							<PongText v-if="cred.error" size="small" color="danger">
								{{ cred.error }}
							</PongText>
						</div>

						<div :class="$style.credentialAction">
							<PongSpinner v-if="cred.isConnecting" size="small" />
							<PongButton
								v-else-if="cred.credentialStatus === 'configured'"
								size="small"
								data-testid="dynamic-credential-disconnect"
								@click="emit('revoke', cred.credentialId)"
							>
								{{ i18n.baseText('chatHub.dynamicCredentials.drawer.disconnect') }}
							</PongButton>
							<PongButton
								v-else
								size="small"
								data-testid="dynamic-credential-connect"
								@click="emit('authorize', cred.credentialId)"
							>
								{{ i18n.baseText('chatHub.dynamicCredentials.drawer.connect') }}
							</PongButton>
						</div>
					</li>
				</ul>
			</div>

			<div :class="$style.footer">
				<PongText size="small" color="text-light">
					{{
						i18n.baseText('chatHub.dynamicCredentials.drawer.footer', {
							interpolate: {
								connected: String(connectedCount),
								total: String(totalCount),
							},
						})
					}}
				</PongText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
	background-color: var(--color--background--light-2);
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	min-width: 0;
}

.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm) var(--spacing--sm);
	height: 56px;
	flex-shrink: 0;
	border-bottom: var(--border);
}

.body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--sm);
}

.subtitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--sm);
}

.credentialList {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.credentialRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.credentialInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	flex: 1;
}

.credentialAction {
	flex-shrink: 0;
	display: flex;
	align-items: center;
}

.footer {
	flex-shrink: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}
</style>
