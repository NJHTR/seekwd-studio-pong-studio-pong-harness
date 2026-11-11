<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import { PongButton, PongIcon, PongLink } from '@pong/design-system';
import NDVEmptyState from './NDVEmptyState.vue';
import { I18nT } from 'vue-i18n';
import { EXECUTION_DATA_REDACTION_DOCS_URL } from '@/app/constants';
import type { RedactionInfo } from 'pong-workflow';

defineProps<{
	title: string;
	reason?: RedactionInfo['reason'];
	canReveal: boolean;
	/** A credential the viewer cannot use but can share with themselves to see the data. */
	credentialToShare?: { id: string; name: string };
}>();

const emit = defineEmits<{
	openSettings: [];
	reveal: [];
	shareCredential: [];
}>();

const i18n = useI18n();
</script>

<template>
	<NDVEmptyState :class="$style.root" :title="title" data-test-id="ndv-data-redacted">
		<template #icon>
			<PongIcon icon="shredder" size="xxlarge" color="text-light" />
		</template>
		<template v-if="reason === 'dynamic_credentials'">
			{{ i18n.baseText('ndv.redacted.dynamicCredentials.description') }}
		</template>
		<template v-else-if="reason === 'sub_workflow_redaction_policy'">
			{{ i18n.baseText('ndv.redacted.subWorkflow.description') }}
		</template>
		<template v-else-if="canReveal">
			{{ i18n.baseText('ndv.redacted.description.sentence1') }}<br />
			<I18nT keypath="ndv.redacted.description.sentence2" tag="span" scope="global">
				<template #link>
					<PongLink size="medium" style="white-space: nowrap" @click="emit('openSettings')">{{
						i18n.baseText('ndv.redacted.description.link')
					}}</PongLink>
				</template>
			</I18nT>
		</template>
		<template v-else-if="reason === 'credential_inaccessible'">
			{{ i18n.baseText('ndv.redacted.shareCredential.description') }}
			<template v-if="credentialToShare">
				<br />
				<PongLink
					size="medium"
					data-test-id="redacted-data-share-credential"
					@click="emit('shareCredential')"
				>
					{{
						credentialToShare.name
							? i18n.baseText('ndv.redacted.shareCredential.link', {
									interpolate: { credential: credentialToShare.name },
								})
							: i18n.baseText('ndv.redacted.shareCredential.linkNoName')
					}}
				</PongLink>
			</template>
		</template>
		<template v-else>
			{{ i18n.baseText('ndv.redacted.noPermission.description') }}
		</template>
		<br />
		<PongLink
			:to="EXECUTION_DATA_REDACTION_DOCS_URL"
			size="medium"
			new-window
			data-test-id="redacted-data-docs-link"
		>
			{{ i18n.baseText('generic.learnMore') }}
		</PongLink>
		<template v-if="canReveal" #actions>
			<PongButton
				:label="i18n.baseText('ndv.redacted.revealButton')"
				variant="outline"
				size="medium"
				data-test-id="ndv-reveal-redacted-data"
				@click="emit('reveal')"
			/>
		</template>
	</NDVEmptyState>
</template>

<style lang="css" module>
.root p {
	max-width: 300px;
}
</style>
