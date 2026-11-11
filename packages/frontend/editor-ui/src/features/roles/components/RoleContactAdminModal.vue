<script lang="ts" setup>
import { computed } from 'vue';
import { ElDialog } from 'element-plus';
import { PongLink, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { I18nT } from 'vue-i18n';
import { APP_MODALS_ELEMENT_ID, CUSTOM_ROLES_DOCS_URL } from '@/app/constants';

const props = withDefaults(
	defineProps<{
		customRolesExist?: boolean;
	}>(),
	{
		customRolesExist: false,
	},
);

const visible = defineModel<boolean>();
const i18n = useI18n();

const titleKey = computed(() =>
	props.customRolesExist
		? 'projects.settings.role.contactAdmin.titleWithRoles'
		: 'projects.settings.role.contactAdmin.title',
);

const bodyKey = computed(() =>
	props.customRolesExist
		? 'projects.settings.role.contactAdmin.bodyWithRoles'
		: 'projects.settings.role.contactAdmin.body',
);
</script>

<template>
	<ElDialog
		v-model="visible"
		width="400"
		:show-close="true"
		:append-to="`#${APP_MODALS_ELEMENT_ID}`"
	>
		<template #header>
			<PongText tag="span" size="large" :bold="true">
				{{ i18n.baseText(titleKey) }}
			</PongText>
		</template>

		<div :class="$style.content">
			<PongText tag="p" size="medium">
				<I18nT :keypath="bodyKey" tag="span">
					<template #documentation>
						<PongLink :href="CUSTOM_ROLES_DOCS_URL" :new-window="true">{{
							i18n.baseText('generic.documentation')
						}}</PongLink>
					</template>
				</I18nT>
			</PongText>
		</div>
	</ElDialog>
</template>

<style lang="scss" module>
.content {
	padding: 0;
}
</style>
