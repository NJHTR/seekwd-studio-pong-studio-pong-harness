<script setup lang="ts">
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import type { ChatHubLLMProvider } from '@pong/api-types';
import { PongButton, PongIcon, PongText, PongCallout } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { I18nT } from 'vue-i18n';

defineProps<{
	showMissingAgentCallout: boolean;
	showMissingCredentialsCallout: boolean;
	showDynamicCredentialsMissingCallout: boolean;
	showCreditsClaimedCallout: boolean;
	isNewSession: boolean;
	llmProvider?: ChatHubLLMProvider;
	aiCreditsQuota: string;
	compact?: boolean;
}>();

const emit = defineEmits<{
	selectModel: [];
	setCredentials: [ChatHubLLMProvider];
	dismissCreditsCallout: [];
	openDynamicCredentials: [];
}>();

const i18n = useI18n();
</script>

<template>
	<PongCallout
		v-if="showMissingAgentCallout"
		icon="info"
		theme="secondary"
		:class="[$style.callout, { [$style.calloutCompact]: compact }]"
	>
		<I18nT
			:keypath="
				isNewSession
					? 'chatHub.chat.prompt.callout.selectModel.new'
					: 'chatHub.chat.prompt.callout.selectModel.existing'
			"
			tag="span"
			scope="global"
		>
			<template #link>
				<a href="" @click.prevent="emit('selectModel')">{{
					i18n.baseText(
						isNewSession
							? 'chatHub.chat.prompt.callout.selectModel.new.link'
							: 'chatHub.chat.prompt.callout.selectModel.existing.link',
					)
				}}</a>
			</template>
		</I18nT>
	</PongCallout>

	<PongCallout
		v-else-if="showMissingCredentialsCallout"
		icon="info"
		theme="secondary"
		:class="[$style.callout, { [$style.calloutCompact]: compact }]"
	>
		<I18nT
			:keypath="
				isNewSession
					? 'chatHub.chat.prompt.callout.setCredentials.new'
					: 'chatHub.chat.prompt.callout.setCredentials.existing'
			"
			tag="span"
			scope="global"
		>
			<template #link>
				<a href="" @click.prevent="emit('setCredentials', llmProvider!)">{{
					i18n.baseText(
						isNewSession
							? 'chatHub.chat.prompt.callout.setCredentials.new.link'
							: 'chatHub.chat.prompt.callout.setCredentials.existing.link',
					)
				}}</a>
			</template>
			<template #provider>
				{{ providerDisplayNames[llmProvider!] }}
			</template>
		</I18nT>
	</PongCallout>

	<PongCallout
		v-else-if="showDynamicCredentialsMissingCallout"
		theme="warning"
		:class="[$style.callout, { [$style.calloutCompact]: compact }]"
		data-testid="dynamic-credentials-missing-callout"
	>
		<PongText>{{
			i18n.baseText(
				isNewSession
					? 'chatHub.chat.prompt.callout.dynamicCredentials.missing'
					: 'chatHub.chat.prompt.callout.dynamicCredentials.expired',
			)
		}}</PongText>
		<template #trailingContent>
			<PongButton
				type="warning"
				native-type="button"
				size="small"
				data-testid="dynamic-credentials-connect-button"
				@click="emit('openDynamicCredentials')"
			>
				{{ i18n.baseText('chatHub.chat.prompt.callout.dynamicCredentials.missing.button') }}
			</PongButton>
		</template>
	</PongCallout>

	<PongCallout
		v-else-if="showCreditsClaimedCallout"
		icon="info"
		theme="secondary"
		:class="[$style.callout, { [$style.calloutCompact]: compact }]"
	>
		<PongText>{{ i18n.baseText('freeAi.credits.callout.success.chatHub.beginning') }}</PongText>
		<PongText bold>{{
			i18n.baseText('freeAi.credits.callout.success.chatHub.credits', {
				interpolate: { amount: aiCreditsQuota },
			})
		}}</PongText>
		<PongText>{{ i18n.baseText('freeAi.credits.callout.success.chatHub.end') }}</PongText>

		<template #trailingContent>
			<PongIcon
				icon="x"
				title="Dismiss"
				size="medium"
				type="secondary"
				@click="emit('dismissCreditsCallout')"
			/>
		</template>
	</PongCallout>
</template>

<style lang="scss" module>
.callout {
	margin: -1px;
	padding: var(--spacing--sm);
	border-radius: 16px 16px 0 0;
}

.calloutCompact {
	width: 100%;
	box-shadow: 0 10px 24px 0 #00000010;
}
</style>
