<script lang="ts" setup>
import { useI18n } from '@pong/i18n';
import { PongEmptyState, PongInfoTip } from '@pong/design-system';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';

const i18n = useI18n();
const pageRedirectHelper = usePageRedirectionHelper();

function goToUpgrade() {
	void pageRedirectHelper.goToUpgrade('log-streaming', 'upgrade-log-streaming');
}
</script>

<template>
	<div>
		<div v-if="i18n.baseText('settings.log-streaming.infoText')" class="mb-l">
			<PongInfoTip theme="info" type="note">
				<span v-pong-html="i18n.baseText('settings.log-streaming.infoText')"></span>
			</PongInfoTip>
		</div>
		<div data-test-id="action-box-unlicensed">
			<PongEmptyState
				:description="i18n.baseText('settings.log-streaming.actionBox.description')"
				:button-text="i18n.baseText('settings.log-streaming.actionBox.button')"
				@click:button="goToUpgrade"
			>
				<template #heading>
					<span v-pong-html="i18n.baseText('settings.log-streaming.actionBox.title')" />
				</template>
			</PongEmptyState>
		</div>
	</div>
</template>
