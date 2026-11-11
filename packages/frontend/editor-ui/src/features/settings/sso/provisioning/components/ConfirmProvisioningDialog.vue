<script lang="ts" setup>
import { useI18n } from '@pong/i18n';
import {
	PongButton,
	PongCallout,
	PongCard,
	PongCheckbox,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongIcon,
	PongText,
} from '@pong/design-system';
import { ref, watch, computed } from 'vue';
import { useAccessSettingsCsvExport } from '@/features/settings/sso/provisioning/composables/useAccessSettingsCsvExport';
import type { RoleAssignmentTransitionType } from '../composables/useUserRoleProvisioningForm';
import type { SupportedProtocolType } from '../../sso.store';

defineOptions({ inheritAttrs: false });

const visible = defineModel<boolean>();

const props = withDefaults(
	defineProps<{
		transitionType: RoleAssignmentTransitionType;
		showProjectRolesCsv: boolean;
		authProtocol: SupportedProtocolType;
		willDeleteProjectRules?: boolean;
	}>(),
	{ willDeleteProjectRules: false },
);

const emit = defineEmits<{
	confirmProvisioning: [];
	cancel: [];
}>();

const locale = useI18n();
const downloadingInstanceRolesCsv = ref(false);
const downloadingProjectRolesCsv = ref(false);
const loading = ref(false);
const confirmationChecked = ref(false);
const {
	hasDownloadedInstanceRoleCsv,
	hasDownloadedProjectRoleCsv,
	downloadProjectRolesCsv,
	downloadInstanceRolesCsv,
	accessSettingsCsvExportOnModalClose,
} = useAccessSettingsCsvExport();

const isSwitchingToManual = computed(() => props.transitionType === 'switchToManual');

const messagingKey = computed(() => (isSwitchingToManual.value ? 'disable' : 'enable'));

const shouldShowProjectRolesCsv = computed(() => props.showProjectRolesCsv);

// The manual flow renders no CSV controls, so it must never wait for a download.
const isCsvBackupPending = computed(
	() =>
		!isSwitchingToManual.value &&
		(!hasDownloadedInstanceRoleCsv.value ||
			(shouldShowProjectRolesCsv.value && !hasDownloadedProjectRoleCsv.value)),
);

watch(visible, () => {
	loading.value = false;
	confirmationChecked.value = false;
	accessSettingsCsvExportOnModalClose();
});

const onDownloadInstanceRolesCsv = async () => {
	downloadingInstanceRolesCsv.value = true;
	try {
		await downloadInstanceRolesCsv();
	} finally {
		downloadingInstanceRolesCsv.value = false;
	}
};

const onDownloadProjectRolesCsv = async () => {
	downloadingProjectRolesCsv.value = true;
	try {
		await downloadProjectRolesCsv();
	} finally {
		downloadingProjectRolesCsv.value = false;
	}
};

const onConfirmProvisioningSetting = () => {
	loading.value = true;
	emit('confirmProvisioning');
};
</script>
<template>
	<PongDialog
		v-model:open="visible"
		size="xlarge"
		:header="locale.baseText(`settings.provisioningConfirmDialog.${messagingKey}.title`)"
	>
		<PongDialogBody>
			<div>
				<template v-if="!isSwitchingToManual">
					<div class="mb-s">
						<PongText color="text-base">{{
							locale.baseText('settings.provisioningConfirmDialog.enable.description')
						}}</PongText>
					</div>
					<div class="mb-s">
						<PongText color="text-base"
							><a
								:href="`https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness`"
								target="_blank"
								>{{ locale.baseText('settings.provisioningConfirmDialog.link.docs') }}</a
							></PongText
						>
					</div>
					<ul :class="$style.list" class="mb-s">
						<li>
							<PongText color="text-base">{{
								locale.baseText(
									'settings.provisioningConfirmDialog.button.downloadInstanceRolesCsv',
								)
							}}</PongText>
							<PongButton
								variant="ghost"
								v-if="!hasDownloadedInstanceRoleCsv"
								native-type="button"
								icon="arrow-circle-down"
								data-test-id="provisioning-download-instance-roles-csv-button"
								:disabled="downloadingInstanceRolesCsv"
								:loading="downloadingInstanceRolesCsv"
								:class="[$style.button, 'pong-button--highlight']"
								@click="onDownloadInstanceRolesCsv"
							></PongButton>
							<PongIcon v-else icon="check" color="success" :class="$style.icon"></PongIcon>
						</li>
						<li v-if="shouldShowProjectRolesCsv">
							<PongText color="text-base">{{
								locale.baseText('settings.provisioningConfirmDialog.button.downloadProjectRolesCsv')
							}}</PongText>
							<PongButton
								variant="ghost"
								v-if="!hasDownloadedProjectRoleCsv"
								native-type="button"
								icon="arrow-circle-down"
								data-test-id="provisioning-download-project-roles-csv-button"
								:disabled="downloadingProjectRolesCsv"
								:loading="downloadingProjectRolesCsv"
								:class="[$style.button, 'pong-button--highlight']"
								@click="onDownloadProjectRolesCsv"
							></PongButton>
							<PongIcon v-else icon="check" color="success" :class="$style.icon"></PongIcon>
						</li>
					</ul>
				</template>
				<template v-else>
					<div class="mb-s">
						<PongText color="text-base">{{
							locale.baseText('settings.provisioningConfirmDialog.disable.description')
						}}</PongText>
					</div>
					<div class="mb-s">
						<PongText color="text-base"
							><a
								:href="`https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness`"
								target="_blank"
								>{{ locale.baseText('settings.provisioningConfirmDialog.link.docs') }}</a
							></PongText
						>
					</div>
				</template>
				<div
					v-if="props.willDeleteProjectRules"
					class="mb-s"
					data-test-id="provisioning-project-rules-deletion-warning"
				>
					<PongCallout theme="danger">
						<PongText color="text-base" size="small" :bold="true">{{
							locale.baseText('settings.provisioningConfirmDialog.projectRulesDeletion.warning')
						}}</PongText>
						<br />
						<PongText color="text-base" size="small">{{
							locale.baseText(
								`settings.provisioningConfirmDialog.projectRulesDeletion.description.${messagingKey}`,
							)
						}}</PongText>
					</PongCallout>
				</div>
				<div class="mb-s">
					<PongCard :class="$style.card">
						<PongCheckbox
							v-model="confirmationChecked"
							:disabled="isCsvBackupPending"
							data-test-id="provisioning-confirmation-checkbox"
						>
							<template #label>
								<PongText color="text-base">{{
									locale.baseText(`settings.provisioningConfirmDialog.${messagingKey}.checkbox`)
								}}</PongText>
							</template>
						</PongCheckbox>
					</PongCard>
				</div>
			</div>
		</PongDialogBody>
		<PongDialogFooter>
			<PongButton
				variant="ghost"
				type="button"
				data-test-id="provisioning-cancel-button"
				@click="emit('cancel')"
				>{{ locale.baseText('settings.provisioningConfirmDialog.button.cancel') }}</PongButton
			>
			<PongButton
				variant="solid"
				type="button"
				:disabled="loading || !confirmationChecked || isCsvBackupPending"
				data-test-id="provisioning-confirm-button"
				@click="onConfirmProvisioningSetting"
				>{{
					locale.baseText(`settings.provisioningConfirmDialog.button.${messagingKey}.confirm`)
				}}</PongButton
			>
		</PongDialogFooter>
	</PongDialog>
</template>

<style lang="scss" module>
.button {
	margin-left: var(--spacing--xs);
}

.card {
	background-color: var(--color--background--light-1);
}

.icon {
	height: 32px; // to match height of download button
	margin: 0 var(--spacing--lg);
}

.list {
	padding: 0 var(--spacing--2xs);

	li {
		display: flex;
		align-items: center;

		&::before {
			content: '•';
			margin-right: var(--spacing--3xs);
			margin-bottom: 2px;
		}
	}
}
</style>
