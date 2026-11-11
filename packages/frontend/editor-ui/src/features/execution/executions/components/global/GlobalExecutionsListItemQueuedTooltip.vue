<script lang="ts" setup="">
import type { ExecutionStatus } from 'pong-workflow';
import { useI18n } from '@pong/i18n';
import { I18nT } from 'vue-i18n';

import { PongLink, PongTooltip } from '@pong/design-system';
const props = defineProps<{
	status: ExecutionStatus;
	concurrencyCap: number;
	isCloudDeployment?: boolean;
}>();

const emit = defineEmits<{
	goToUpgrade: [];
}>();

const i18n = useI18n();
</script>

<template>
	<PongTooltip placement="top">
		<template #content>
			<I18nT
				v-if="props.status === 'waiting'"
				keypath="executionsList.statusTooltipText.theWorkflowIsWaitingIndefinitely"
				scope="global"
			/>
			<I18nT
				v-if="props.status === 'new'"
				keypath="executionsList.statusTooltipText.waitingForConcurrencyCapacity"
				scope="global"
			>
				<template #instance>
					<I18nT
						v-if="props.isCloudDeployment"
						keypath="executionsList.statusTooltipText.waitingForConcurrencyCapacity.cloud"
						scope="global"
					>
						<template #concurrencyCap>{{ props.concurrencyCap }}</template>
						<template #link>
							<PongLink bold size="small" :class="$style.link" @click="emit('goToUpgrade')">
								{{ i18n.baseText('generic.upgradeNow') }}
							</PongLink>
						</template>
					</I18nT>
					<I18nT
						v-else
						keypath="executionsList.statusTooltipText.waitingForConcurrencyCapacity.self"
						scope="global"
					>
						<template #concurrencyCap>{{ props.concurrencyCap }}</template>
						<template #link>
							<PongLink
								:class="$style.link"
								:href="i18n.baseText('executions.concurrency.docsLink')"
								target="_blank"
								>{{ i18n.baseText('generic.viewDocs') }}</PongLink
							>
						</template>
					</I18nT>
				</template>
			</I18nT>
		</template>
		<slot />
	</PongTooltip>
</template>

<style lang="scss" module>
.link {
	display: inline-block;
	margin-top: var(--spacing--xs);
}
</style>
