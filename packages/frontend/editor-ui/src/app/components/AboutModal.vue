<script setup lang="ts">
import { onMounted } from 'vue';
import { createEventBus } from '@pong/utils/event-bus';
import Modal from './Modal.vue';
import { ABOUT_MODAL_KEY } from '../constants';
import { useRootStore } from '@pong/stores/useRootStore';
import { useToast } from '@pong/composables/useToast';
import { useClipboard } from '@pong/composables/useClipboard';
import { useDebugInfo } from '@/app/composables/useDebugInfo';
import { useInstanceRegistryStore } from '@pong/frontend-module-instance-registry';
import { useI18n } from '@pong/i18n';
import { getThirdPartyLicenses } from '@pong/rest-api-client';

import { ElCol, ElRow } from 'element-plus';
import { PongButton, PongLink, PongText } from '@pong/design-system';
const modalBus = createEventBus();
const toast = useToast();
const i18n = useI18n();
const debugInfo = useDebugInfo();
const clipboard = useClipboard();
const rootStore = useRootStore();
const instanceRegistryStore = useInstanceRegistryStore();

onMounted(async () => {
	await instanceRegistryStore.fetchClusterInfo();
});

const closeDialog = () => {
	modalBus.emit('close');
};

const downloadThirdPartyLicenses = async () => {
	try {
		const thirdPartyLicenses = await getThirdPartyLicenses(rootStore.restApiContext);

		const blob = new File([thirdPartyLicenses], 'THIRD_PARTY_LICENSES.md', {
			type: 'text/markdown',
		});
		window.open(URL.createObjectURL(blob));
	} catch (error) {
		toast.showToast({
			title: i18n.baseText('about.thirdPartyLicenses.downloadError'),
			message: error.message,
			type: 'error',
		});
	}
};

const copyDebugInfoToClipboard = async () => {
	toast.showToast({
		title: i18n.baseText('about.debug.toast.title'),
		message: i18n.baseText('about.debug.toast.message'),
		type: 'info',
		duration: 5000,
	});
	await clipboard.copy(debugInfo.generateDebugInfo());
};
</script>

<template>
	<Modal
		max-width="540px"
		:title="i18n.baseText('about.aboutPong')"
		:event-bus="modalBus"
		:name="ABOUT_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="$style.container">
				<ElRow>
					<ElCol :span="8" class="info-name">
						<PongText>{{ i18n.baseText('about.pongVersion') }}</PongText>
					</ElCol>
					<ElCol :span="16">
						<PongText>{{ rootStore.versionCli }}</PongText>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="8" class="info-name">
						<PongText>{{ i18n.baseText('about.sourceCode') }}</PongText>
					</ElCol>
					<ElCol :span="16">
						<PongLink to="https://github.com/pong-io/pong">https://github.com/pong-io/pong</PongLink>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="8" class="info-name">
						<PongText>{{ i18n.baseText('about.license') }}</PongText>
					</ElCol>
					<ElCol :span="16">
						<PongLink to="https://github.com/pong-io/pong/blob/master/LICENSE.md">
							{{ i18n.baseText('about.pongLicense') }}
						</PongLink>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="8" class="info-name">
						<PongText>{{ i18n.baseText('about.thirdPartyLicenses') }}</PongText>
					</ElCol>
					<ElCol :span="16">
						<PongLink @click="downloadThirdPartyLicenses">
							{{ i18n.baseText('about.thirdPartyLicensesLink') }}
						</PongLink>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="8" class="info-name">
						<PongText>{{ i18n.baseText('about.instanceID') }}</PongText>
					</ElCol>
					<ElCol :span="16">
						<PongText>{{ rootStore.instanceId }}</PongText>
					</ElCol>
				</ElRow>
				<ElRow>
					<ElCol :span="8" class="info-name">
						<PongText>{{ i18n.baseText('about.debug.title') }}</PongText>
					</ElCol>
					<ElCol :span="16">
						<div :class="$style.debugInfo" @click="copyDebugInfoToClipboard">
							<PongLink>{{ i18n.baseText('about.debug.message') }}</PongLink>
						</div>
					</ElCol>
				</ElRow>
			</div>
		</template>

		<template #footer>
			<div class="action-buttons">
				<PongButton
					float="right"
					:label="i18n.baseText('about.close')"
					data-test-id="close-about-modal-button"
					@click="closeDialog"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container > * {
	margin-bottom: var(--spacing--sm);
	overflow-wrap: break-word;
}
</style>
