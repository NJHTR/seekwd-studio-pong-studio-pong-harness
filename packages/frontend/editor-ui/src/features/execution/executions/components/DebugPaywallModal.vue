<script lang="ts" setup>
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@pong/i18n';

import { PongButton, PongLink, PongText } from '@pong/design-system';
const props = defineProps<{
	modalName: string;
	data: { title: string; footerButtonAction: () => void };
}>();

const i18n = useI18n();
</script>

<template>
	<Modal width="500px" :title="props.data.title" :name="props.modalName">
		<template #content>
			<PongText>
				{{ i18n.baseText('executionsList.debug.paywall.content') }}
				<br />
				<br />
				{{ i18n.baseText('executionsList.debug.paywall.subContent') }}
				<PongLink :to="i18n.baseText('executionsList.debug.paywall.link.url')" new-window>
					{{ i18n.baseText('executionsList.debug.paywall.link.text') }}
				</PongLink>
			</PongText>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<PongButton @click="props.data.footerButtonAction">
					{{ i18n.baseText('generic.seePlans') }}
				</PongButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}
</style>
