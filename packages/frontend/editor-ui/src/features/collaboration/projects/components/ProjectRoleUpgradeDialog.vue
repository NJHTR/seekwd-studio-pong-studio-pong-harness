<script lang="ts" setup>
import { useI18n } from '@pong/i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { APP_MODALS_ELEMENT_ID } from '@/app/constants';
import { I18nT } from 'vue-i18n';

import { ElDialog } from 'element-plus';
import { PongButton } from '@pong/design-system';
type Props = {
	limit: number;
	planName?: string;
};

const props = defineProps<Props>();
const visible = defineModel<boolean>();
const pageRedirectionHelper = usePageRedirectionHelper();
const locale = useI18n();

const goToUpgrade = async () => {
	await pageRedirectionHelper.goToUpgrade('rbac', 'upgrade-rbac');
	visible.value = false;
};
</script>
<template>
	<ElDialog
		v-model="visible"
		:title="locale.baseText('projects.settings.role.upgrade.title')"
		width="500"
		:append-to="`#${APP_MODALS_ELEMENT_ID}`"
	>
		<div class="pt-l">
			<I18nT keypath="projects.settings.role.upgrade.message" scope="global">
				<template #planName>{{ props.planName }}</template>
				<template #limit>
					{{
						locale.baseText('projects.create.limit', {
							adjustToNumber: props.limit,
							interpolate: { count: String(props.limit) },
						})
					}}
				</template>
			</I18nT>
		</div>
		<template #footer>
			<div :class="$style.footer">
				<PongButton variant="outline" native-type="button" @click="visible = false">{{
					locale.baseText('generic.cancel')
				}}</PongButton>
				<PongButton variant="solid" native-type="button" @click="goToUpgrade">{{
					locale.baseText('projects.create.limitReached.link')
				}}</PongButton>
			</div>
		</template>
	</ElDialog>
</template>

<style lang="scss" module>
.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
