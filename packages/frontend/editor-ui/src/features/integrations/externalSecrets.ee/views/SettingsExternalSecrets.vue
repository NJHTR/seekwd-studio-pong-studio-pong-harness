<script lang="ts" setup>
import { useI18n } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useExternalSecretsStore } from '../externalSecrets.ee.store';
import { computed, onMounted } from 'vue';
import ExternalSecretsProviderCard from '../components/ExternalSecretsProviderCard.ee.vue';
import type { ExternalSecretsProvider } from '../externalSecrets.types';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { I18nT } from 'vue-i18n';

import { PongEmptyState, PongCallout, PongHeading } from '@pong/design-system';
const i18n = useI18n();
const externalSecretsStore = useExternalSecretsStore();
const toast = useToast();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const sortedProviders = computed(() => {
	return ([...externalSecretsStore.providers] as ExternalSecretsProvider[]).sort((a, b) => {
		return b.name.localeCompare(a.name);
	});
});

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.externalSecrets.title'));
	if (!externalSecretsStore.isEnterpriseExternalSecretsEnabled) return;
	try {
		void externalSecretsStore.fetchGlobalSecrets();
		void externalSecretsStore.getProviders();
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	}
});

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('external-secrets', 'upgrade-external-secrets');
}
</script>

<template>
	<div class="pb-3xl">
		<PongHeading size="2xlarge">{{ i18n.baseText('settings.externalSecrets.title') }}</PongHeading>
		<div
			v-if="externalSecretsStore.isEnterpriseExternalSecretsEnabled"
			data-test-id="external-secrets-content-licensed"
		>
			<PongCallout theme="secondary" class="mt-2xl mb-l">
				{{ i18n.baseText('settings.externalSecrets.info') }}
				<a href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" target="_blank">
					{{ i18n.baseText('settings.externalSecrets.info.link') }}
				</a>
			</PongCallout>
			<ExternalSecretsProviderCard
				v-for="provider in sortedProviders"
				:key="provider.name"
				:provider="provider"
			/>
		</div>
		<PongEmptyState
			v-else
			class="mt-2xl mb-l"
			data-test-id="external-secrets-content-unlicensed"
			:button-text="i18n.baseText('settings.externalSecrets.actionBox.buttonText')"
			@click="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.externalSecrets.actionBox.title') }}</span>
			</template>
			<template #description>
				<I18nT keypath="settings.externalSecrets.actionBox.description" scope="global">
					<template #link>
						<a href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" target="_blank">
							{{ i18n.baseText('settings.externalSecrets.actionBox.description.link') }}
						</a>
					</template>
				</I18nT>
			</template>
		</PongEmptyState>
	</div>
</template>
