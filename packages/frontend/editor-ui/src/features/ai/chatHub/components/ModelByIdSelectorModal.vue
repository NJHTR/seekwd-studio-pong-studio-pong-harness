<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { PongButton, PongFormInput, PongHeading, PongText } from '@pong/design-system';
import Modal from '@/app/components/Modal.vue';
import { createEventBus } from '@pong/utils/event-bus';
import { type ChatHubLLMProvider, PROVIDER_CREDENTIAL_TYPE_MAP } from '@pong/api-types';
import {
	CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
	providerDisplayNames,
} from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useI18n } from '@pong/i18n';

const props = defineProps<{
	modalName: string;
	data: {
		provider: ChatHubLLMProvider;
		initialValue: string | null;
		onSelect: (provider: ChatHubLLMProvider, modelId: string) => void;
	};
}>();

const modalBus = ref(createEventBus());
const modelId = ref<string | null>(props.data.initialValue);
const inputRef = ref<InstanceType<typeof PongFormInput> | null>(null);

const i18n = useI18n();

onMounted(() => {
	// With modals normal focusing via `props.focus-initially` on PongFormInput does not work
	setTimeout(() => {
		inputRef.value?.inputRef?.select();
		inputRef.value?.inputRef?.focus();
	});
});

function onConfirm() {
	if (modelId.value) {
		props.data.onSelect(props.data.provider, modelId.value);
		modalBus.value.emit('close');
	}
}

function onCancel() {
	modalBus.value.emit('close');
}
</script>

<template>
	<Modal
		:name="CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY"
		:event-bus="modalBus"
		width="50%"
		:center="true"
		max-width="460px"
		min-height="250px"
	>
		<template #header>
			<div :class="$style.header">
				<CredentialIcon
					:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[data.provider]"
					:size="24"
					:class="$style.icon"
				/>
				<PongHeading size="medium" tag="h2" :class="$style.title">
					{{
						i18n.baseText('chatHub.models.byIdSelector.title', {
							interpolate: {
								provider: providerDisplayNames[data.provider],
							},
						})
					}}
				</PongHeading>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<PongText size="small" color="text-base">
					{{ i18n.baseText('chatHub.models.byIdSelector.choose') }}
				</PongText>
				<PongFormInput
					ref="inputRef"
					v-model="modelId"
					name="model"
					label=""
					max-length="64"
					focus-initially
					@enter="onConfirm"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<PongButton variant="outline" @click="onCancel">
					{{ i18n.baseText('chatHub.models.byIdSelector.cancel') }}
				</PongButton>
				<PongButton variant="solid" :disabled="!modelId" @click="onConfirm">
					{{ i18n.baseText('chatHub.models.byIdSelector.confirm') }}
				</PongButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}

.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.icon {
	flex-shrink: 0;
	flex-grow: 0;
}
</style>
