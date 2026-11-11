<script lang="ts" setup>
import { computed, ref } from 'vue';
import {
	PongButton,
	PongCheckbox,
	PongDialog,
	PongDialogBody,
	PongDialogFooter,
	PongText,
} from '@pong/design-system';
import { i18n as locale } from '@pong/i18n';

defineOptions({ inheritAttrs: false });

interface Props {
	modelValue: boolean;
	eulaUrl: string;
}

defineProps<Props>();
const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	accept: [];
	cancel: [];
}>();

const accepted = ref(false);
const isAcceptDisabled = computed(() => !accepted.value);

const onCancel = () => {
	accepted.value = false;
	emit('cancel');
};

const onAccept = () => {
	emit('accept');
};

const onDialogOpenUpdate = (open: boolean) => {
	if (open) return;
	emit('update:modelValue', false);
	onCancel();
};
</script>

<template>
	<PongDialog
		:open="modelValue"
		size="large"
		:header="locale.baseText('settings.usageAndPlan.dialog.eula.title')"
		data-test-id="eula-acceptance-modal"
		@update:open="onDialogOpenUpdate"
	>
		<PongDialogBody>
			<PongText color="text-base" size="medium">
				{{ locale.baseText('settings.usageAndPlan.dialog.eula.description') }}
			</PongText>

			<PongText :class="$style.auditNotice" color="text-base" size="medium" tag="p">
				<em>{{ locale.baseText('settings.usageAndPlan.dialog.eula.audit.notice') }}</em>
			</PongText>

			<div :class="$style.checkboxWrapper">
				<PongCheckbox v-model="accepted" data-test-id="eula-checkbox">
					<template #label>
						<span>
							{{ locale.baseText('settings.usageAndPlan.dialog.eula.checkbox.label') }}
							{{ ' ' }}
							<a :href="eulaUrl" target="_blank" rel="noopener noreferrer" data-test-id="eula-link">
								{{ locale.baseText('settings.usageAndPlan.dialog.eula.link.text') }} </a
							>.
						</span>
					</template>
				</PongCheckbox>
			</div>
		</PongDialogBody>
		<PongDialogFooter>
			<PongButton variant="outline" data-test-id="eula-cancel-button" @click="onCancel">
				{{ locale.baseText('settings.usageAndPlan.dialog.eula.button.cancel') }}
			</PongButton>
			<PongButton
				variant="solid"
				:disabled="isAcceptDisabled"
				data-test-id="eula-accept-button"
				@click="onAccept"
			>
				{{ locale.baseText('settings.usageAndPlan.dialog.eula.button.accept') }}
			</PongButton>
		</PongDialogFooter>
	</PongDialog>
</template>

<style lang="scss" module>
.auditNotice {
	margin-top: var(--spacing--sm);
}

.checkboxWrapper {
	margin-top: var(--spacing--md);
}
</style>
