<script setup lang="ts">
import { computed, ref } from 'vue';
import { PongButton, PongCheckbox, PongIcon, PongLogo } from '@pong/design-system';
import { useConnection } from './composables/useConnection';
import InfoRow from './components/InfoRow.vue';
import RememberedHosts from './components/RememberedHosts.vue';
import TabList from './components/TabList.vue';

const {
	status,
	tabs,
	selectedTabIds,
	errorMessage,
	hasRelayUrl,
	isRelayAllowed,
	isAutoConnect,
	relayHostKey,
	rememberInstance,
	approvedHosts,
	controlledTabs,
	toggleTab,
	connect,
	decline,
	disconnect,
	forgetHost,
} = useConnection();

const showTabSelection = ref(false);

const isConnected = computed(() => status.value === 'connected');
const showConnectPrompt = computed(() => hasRelayUrl.value && isRelayAllowed.value);
</script>

<template>
	<div class="card">
		<div class="content">
			<PongLogo class="logo" size="small" :collapsed="false" />

			<template v-if="isConnected">
				<h1 class="title">
					<span class="status-dot" />
					Connected to pong
				</h1>
				<div class="panel">
					<InfoRow
						icon="shield"
						:title="
							relayHostKey ? `Connected to ${relayHostKey}` : 'Connected to your pong instance'
						"
					/>
					<InfoRow
						icon="lock"
						title="Browser access"
						description="Tabs pong opens will appear below"
					/>
					<template v-if="controlledTabs.length">
						<hr class="divider" />
						<TabList :tabs="controlledTabs" />
					</template>
				</div>
				<RememberedHosts :hosts="approvedHosts" @forget="forgetHost" />
			</template>

			<template v-else-if="showConnectPrompt">
				<h1 class="title">Allow pong to access your browser</h1>
				<p v-if="isAutoConnect" class="subtitle">Auto-connecting (eval mode)…</p>
				<div class="panel">
					<InfoRow
						icon="shield"
						:title="`Connecting to ${relayHostKey}`"
						description="Only continue if you initiated this connection"
					>
						<PongCheckbox
							v-if="!isAutoConnect"
							v-model="rememberInstance"
							class="remember"
							:label="`Always allow ${relayHostKey}`"
						/>
					</InfoRow>
					<InfoRow
						icon="lock"
						title="Browser access"
						description="pong can access tabs it opens. Tabs you select below are shared for this connection only"
					>
						<button
							v-if="tabs.length"
							class="tabs-toggle"
							@click="showTabSelection = !showTabSelection"
						>
							Allow access to existing tabs{{
								selectedTabIds.size ? ` (${selectedTabIds.size})` : ''
							}}
							<PongIcon :icon="showTabSelection ? 'chevron-up' : 'chevron-down'" size="medium" />
						</button>
					</InfoRow>
					<template v-if="showTabSelection && tabs.length">
						<hr class="divider" />
						<TabList
							:tabs="tabs"
							selectable
							:selected-tab-ids="selectedTabIds"
							@toggle-tab="toggleTab"
						/>
					</template>
				</div>
			</template>

			<template v-else-if="hasRelayUrl">
				<h1 class="title">Allow pong to access your browser</h1>
				<p class="error">
					Can't connect to <strong>{{ relayHostKey || 'this address' }}</strong> — it isn't a valid
					pong instance.
				</p>
			</template>

			<template v-else>
				<h1 class="title">pong Browser Use extension</h1>
				<div class="panel">
					<InfoRow
						icon="eye-off"
						title="Disconnected"
						description="Initiate the connection from your pong instance to get started"
					/>
				</div>
				<RememberedHosts :hosts="approvedHosts" @forget="forgetHost" />
			</template>

			<p v-if="errorMessage" class="error">{{ errorMessage }}</p>
		</div>

		<div v-if="isConnected" class="footer">
			<PongButton variant="outline" size="large" @click="disconnect">Disconnect</PongButton>
		</div>
		<div v-else-if="showConnectPrompt" class="footer">
			<PongButton variant="ghost" size="large" @click="decline">Decline</PongButton>
			<PongButton size="large" :disabled="status === 'connecting'" @click="connect"
				>Allow connection</PongButton
			>
		</div>
	</div>
</template>

<style scoped lang="scss">
.card {
	display: flex;
	flex-direction: column;
	width: min(500px, 100%);
	margin: 0 auto;
	height: min(700px, calc(100dvh - 2 * var(--spacing--md)));
	min-height: 420px;
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius--xl);
	box-shadow: var(--shadow--sm);
	overflow: hidden;

	// In a popup window the window itself is the card — no chrome, fill the viewport
	@media (max-width: 550px) {
		width: 100%;
		max-width: 100vw;
		height: 100dvh;
		min-height: 0;
		border: none;
		border-radius: 0;
		box-shadow: none;
	}
}

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--xl);
	padding-bottom: var(--spacing--xs);
}

.logo {
	justify-content: flex-start;
	margin-bottom: var(--spacing--lg);
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
	margin: 0 0 var(--spacing--lg);
}

.status-dot {
	width: var(--height--4xs);
	height: var(--height--4xs);
	border-radius: 50%;
	background: var(--color--success);
	flex-shrink: 0;
}

.subtitle {
	font-size: var(--font-size--sm);
	color: var(--text-color--subtler);
	margin: 0 0 var(--spacing--sm);
}

.divider {
	border: none;
	border-top: var(--border);
	margin: 0;
}

.tabs-toggle {
	appearance: none;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
	padding: var(--spacing--3xs) var(--spacing--xs);
	background: transparent;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;
	font-size: var(--font-size--xs);
	color: var(--text-color);

	&:hover {
		background: var(--background--hover);
	}
}

.remember {
	--checkbox--label--font-size: var(--font-size--xs);
	margin-top: var(--spacing--sm);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--spacing--md) var(--spacing--xl) var(--spacing--xl);
}

.error {
	color: var(--text-color--danger);
	font-size: var(--font-size--xs);
	margin-top: var(--spacing--2xs);
}
</style>

<style>
html {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 100vh;
	padding: var(--spacing--md);
}

/* body is a flex item of html — without min-width: 0, nowrap tab URLs
   propagate their intrinsic width and stretch the page beyond the viewport */
body {
	min-width: 0;
	width: 100%;
}

@media (max-width: 550px) {
	html {
		padding: 0;
	}
}
</style>
