<script setup lang="ts">
import { useCredentialDescriptionsExperiment } from '@/experiments/credentialDescriptions/useCredentialDescriptionsExperiment';
import TimeAgo from '@/app/components/TimeAgo.vue';
import CharacterCount from '@/app/components/CharacterCount.vue';
import { useI18n } from '@pong/i18n';
import type { ICredentialsDecryptedResponse, ICredentialsResponse } from '../../credentials.types';
import { ElCol, ElRow } from 'element-plus';
import { PongInput, PongInputLabel, PongText } from '@pong/design-system';
import { CREDENTIAL_DESCRIPTION_MAX_LENGTH } from '@pong/api-types';
import { useId } from 'vue';
type Props = {
	currentCredential: ICredentialsResponse | ICredentialsDecryptedResponse | null;
	description: string;
	readonly: boolean;
};

defineProps<Props>();
const { isEnabled: credentialDescriptionsEnabled } = useCredentialDescriptionsExperiment();

const emit = defineEmits<{ 'update:description': [value: string] }>();

const i18n = useI18n();
const descriptionId = useId();
const descriptionCountId = `${descriptionId}-count`;
</script>

<template>
	<div :class="$style.container">
		<ElRow v-if="credentialDescriptionsEnabled">
			<ElCol :span="8" :class="$style.label">
				<PongInputLabel
					:input-name="descriptionId"
					:label="i18n.baseText('credentialEdit.credentialInfo.description')"
				/>
			</ElCol>
			<ElCol :span="16">
				<PongInput
					:id="descriptionId"
					:aria-describedby="readonly ? undefined : descriptionCountId"
					:model-value="description"
					type="textarea"
					:autosize="{ minRows: 4, maxRows: 8 }"
					:maxlength="CREDENTIAL_DESCRIPTION_MAX_LENGTH"
					:readonly="readonly"
					:placeholder="
						readonly
							? undefined
							: i18n.baseText('credentialEdit.credentialInfo.description.placeholder')
					"
					data-test-id="credential-description"
					@update:model-value="emit('update:description', $event)"
				/>
				<CharacterCount
					v-if="!readonly"
					:id="descriptionCountId"
					:value="description"
					:max="CREDENTIAL_DESCRIPTION_MAX_LENGTH"
					show-when-empty
					data-test-id="credential-description-character-count"
				/>
			</ElCol>
		</ElRow>
		<ElRow v-if="currentCredential">
			<ElCol :span="8" :class="$style.label">
				<PongText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.created') }}
				</PongText>
			</ElCol>
			<ElCol :span="16" :class="$style.valueLabel">
				<PongText :compact="true"
					><TimeAgo :date="currentCredential.createdAt" :capitalize="true"
				/></PongText>
			</ElCol>
		</ElRow>
		<ElRow v-if="currentCredential">
			<ElCol :span="8" :class="$style.label">
				<PongText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.lastModified') }}
				</PongText>
			</ElCol>
			<ElCol :span="16" :class="$style.valueLabel">
				<PongText :compact="true"
					><TimeAgo :date="currentCredential.updatedAt" :capitalize="true"
				/></PongText>
			</ElCol>
		</ElRow>
		<ElRow v-if="currentCredential">
			<ElCol :span="8" :class="$style.label">
				<PongText :compact="true" :bold="true">
					{{ i18n.baseText('credentialEdit.credentialInfo.id') }}
				</PongText>
			</ElCol>
			<ElCol :span="16" :class="$style.valueLabel">
				<PongText :compact="true">{{ currentCredential.id }}</PongText>
			</ElCol>
		</ElRow>
	</div>
</template>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing--lg);
	}
}

.label {
	font-weight: var(--font-weight--medium);
	max-width: 230px;
}

.accessLabel {
	composes: label;
	margin-top: var(--spacing--5xs);
}

.valueLabel {
	font-weight: var(--font-weight--regular);
}
</style>
