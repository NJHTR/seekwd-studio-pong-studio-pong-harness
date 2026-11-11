<script setup lang="ts">
import { useInstallNode } from '../composables/useInstallNode';
import { useTelemetry } from '@pong/composables/useTelemetry';
import {
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	COMMUNITY_NODES_INSTALLATION_DOCS_URL,
	COMMUNITY_NODES_RISKS_DOCS_URL,
	NPM_KEYWORD_SEARCH_URL,
} from '../communityNodes.constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useI18n } from '@pong/i18n';
import { computed, ref } from 'vue';
import {
	PongButton,
	PongCheckbox,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongInput,
	PongInputLabel,
	PongLink,
	PongText,
} from '@pong/design-system';
import { useQuickConnect } from '@/features/credentials/quickConnect/composables/useQuickConnect';

defineOptions({ inheritAttrs: false });

interface ModalData {
	packageName?: string;
	disableInput?: boolean;
	hideSuggestion?: boolean;
	nodeType?: string;
}

const telemetry = useTelemetry();
const i18n = useI18n();
const { installNode, loading } = useInstallNode();
const uiStore = useUIStore();

const modalOpen = computed(
	() => uiStore.modalsById[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY]?.open === true,
);

const modalData = computed(
	() => uiStore.modalsById[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY]?.data as ModalData | undefined,
);
const packageName = ref(modalData.value?.packageName ?? '');
const userAgreed = ref(false);
const checkboxWarning = ref(false);
const infoTextErrorMessage = ref('');
const { getQuickConnectOptionByPackageName } = useQuickConnect();
const quickConnect = computed(() => getQuickConnectOptionByPackageName(packageName.value));

const openNPMPage = () => {
	telemetry.track('user clicked cnr browse button', { source: 'cnr install modal' });
	window.open(NPM_KEYWORD_SEARCH_URL, '_blank');
};

const onInstallClick = async () => {
	if (!userAgreed.value) {
		checkboxWarning.value = true;
	} else {
		infoTextErrorMessage.value = '';
		const result = await installNode({
			type: 'unverified',
			packageName: packageName.value,
			nodeType: modalData.value?.nodeType,
			telemetry: {
				source: 'cnr settings page',
				hasQuickConnect: quickConnect.value !== undefined,
			},
		});
		if (result.error && 'httpStatusCode' in result.error && result.error.httpStatusCode === 400) {
			infoTextErrorMessage.value = result.error.message;
		}

		if (result.success) {
			void closeDialog();
		}
	}
};

const onCheckboxChecked = () => {
	checkboxWarning.value = false;
};

const onModalClose = () => {
	return !loading.value;
};

async function closeDialog() {
	const shouldClose = onModalClose();
	if (shouldClose === false) {
		return;
	}
	uiStore.closeModal(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

const onInputBlur = () => {
	packageName.value = packageName.value.replaceAll('npm i ', '').replaceAll('npm install ', '');
};

const onMoreInfoTopClick = () => {
	telemetry.track('user clicked cnr docs link', { source: 'install package modal top' });
};

const onLearnMoreLinkClick = () => {
	telemetry.track('user clicked cnr docs link', {
		source: 'install package modal bottom',
	});
};
</script>

<template>
	<PongDialog
		:open="modalOpen"
		size="large"
		:header="i18n.baseText('settings.communityNodes.installModal.title')"
		:show-close-button="!loading"
		@update:open="onDialogOpenUpdate"
	>
		<PongDialogBody>
			<div :data-test-id="`${COMMUNITY_PACKAGE_INSTALL_MODAL_KEY}-modal`">
				<div v-if="!modalData?.hideSuggestion" :class="[$style.descriptionContainer, 'p-s']">
					<div>
						<PongText>
							{{ i18n.baseText('settings.communityNodes.installModal.description') }}
						</PongText>
						{{ ' ' }}
						<PongLink :to="COMMUNITY_NODES_INSTALLATION_DOCS_URL" @click="onMoreInfoTopClick">
							{{ i18n.baseText('generic.moreInfo') }}
						</PongLink>
					</div>
					<PongButton
						:label="i18n.baseText('settings.communityNodes.browseButton.label')"
						icon="external-link"
						:class="$style.browseButton"
						@click="openNPMPage"
					/>
				</div>
				<div :class="[$style.formContainer, 'mt-m']">
					<PongInputLabel
						:class="$style.labelTooltip"
						:label="i18n.baseText('settings.communityNodes.installModal.packageName.label')"
						:tooltip-text="
							i18n.baseText('settings.communityNodes.installModal.packageName.tooltip', {
								interpolate: { npmURL: NPM_KEYWORD_SEARCH_URL },
							})
						"
					>
						<PongInput
							v-model="packageName"
							name="packageNameInput"
							type="text"
							data-test-id="package-name-input"
							:maxlength="214"
							:placeholder="
								i18n.baseText('settings.communityNodes.installModal.packageName.placeholder')
							"
							:required="true"
							:disabled="loading || modalData?.disableInput"
							@blur="onInputBlur"
						/>
					</PongInputLabel>
					<div :class="[$style.infoText, 'mt-4xs']">
						<span
							size="small"
							:class="[$style.infoText, infoTextErrorMessage ? $style.error : '']"
							v-text="infoTextErrorMessage"
						></span>
					</div>
					<PongCheckbox
						v-model="userAgreed"
						:class="[$style.checkbox, checkboxWarning ? $style.error : '', 'mt-l']"
						:disabled="loading"
						data-test-id="user-agreement-checkbox"
						@change="onCheckboxChecked"
					>
						<template #label>
							<PongText>
								{{ i18n.baseText('settings.communityNodes.installModal.checkbox.label') }} </PongText
							><br />
							<PongLink :to="COMMUNITY_NODES_RISKS_DOCS_URL" @click="onLearnMoreLinkClick">{{
								i18n.baseText('generic.moreInfo')
							}}</PongLink>
						</template>
					</PongCheckbox>
				</div>
			</div>
		</PongDialogBody>
		<PongDialogFooter>
			<PongButton
				:loading="loading"
				:disabled="!userAgreed || packageName === '' || loading"
				:label="
					loading
						? i18n.baseText('settings.communityNodes.installModal.installButton.label.loading')
						: i18n.baseText('settings.communityNodes.installModal.installButton.label')
				"
				size="large"
				float="right"
				data-test-id="install-community-package-button"
				@click="onInstallClick"
			/>
		</PongDialogFooter>
	</PongDialog>
</template>

<style module lang="scss">
.descriptionContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border: var(--border-width) var(--border-style) var(--color--info--tint-1);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);

	button {
		& > span {
			flex-direction: row-reverse;
			& > span {
				margin-left: var(--spacing--3xs);
			}
		}
	}
}

.formContainer {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text);
}

.checkbox {
	span:nth-child(2) {
		vertical-align: text-top;
	}
}

.error {
	color: var(--color--danger);

	span {
		border-color: var(--color--danger);
	}
}
</style>

<style lang="scss">
.el-tooltip__popper {
	max-width: 240px;
	img {
		width: 100%;
	}
	p {
		line-height: 1.2;
	}
	p + p {
		margin-top: var(--spacing--2xs);
	}
}
</style>
