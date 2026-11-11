<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n, type BaseTextKey } from '@pong/i18n';
import { useToast } from '@pong/composables/useToast';
import {
	PongPreviewBadge,
	PongSettingsLayout,
	PongSettingsPageHeader,
	PongSettingsRow,
	PongSettingsRowConfigure,
	PongSettingsRowGroup,
} from '@pong/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';

import { useContextStore } from '../context.store';
import { isContextSkillsEnabled } from '../context.utils';
import { useSkillsStore } from '../skills.store';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const contextStore = useContextStore();
const skillsStore = useSkillsStore();
// The skills row follows the skills module. Preferences are always on.
const skillsEnabled = isContextSkillsEnabled();
const { showError } = useToast();

const preferenceCount = computed(() =>
	i18n.baseText('settings.context.preferences.count', {
		interpolate: { count: contextStore.count },
		adjustToNumber: contextStore.count,
	}),
);

const skillCount = computed(() =>
	i18n.baseText('settings.context.skills.count', {
		interpolate: { count: skillsStore.count },
		adjustToNumber: skillsStore.count,
	}),
);

async function openSkills() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT_SKILLS });
}

async function openPreferences() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT_PREFERENCES });
}

/** Each row reports its own failure: it would otherwise show a zero as though it were real. */
async function loadCount(fetchCount: () => Promise<unknown>, errorKey: BaseTextKey) {
	try {
		await fetchCount();
	} catch (error) {
		showError(error, i18n.baseText(errorKey));
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.context.title'));
	await Promise.all([
		loadCount(
			async () => await contextStore.fetchPreferenceCount(),
			'settings.context.preferences.error.load',
		),
		skillsEnabled &&
			loadCount(
				async () => await skillsStore.fetchSkillCount(),
				'settings.context.skills.error.load',
			),
	]);
});
</script>

<template>
	<PongSettingsLayout :class="$style.layout" data-test-id="settings-context-view">
		<PongSettingsPageHeader
			:title="i18n.baseText('settings.context.title')"
			:description="i18n.baseText('settings.context.description')"
			:show-docs-link="false"
		>
			<template #titleTrailing>
				<PongPreviewBadge size="xsmall" />
			</template>
		</PongSettingsPageHeader>

		<PongSettingsRowGroup>
			<PongSettingsRow
				clickable
				:title="i18n.baseText('settings.context.preferences.title')"
				:description="i18n.baseText('settings.context.preferences.subtitle')"
				data-test-id="settings-context-preferences-row"
				@click="openPreferences"
			>
				<template #action>
					<PongSettingsRowConfigure :value="preferenceCount" />
				</template>
			</PongSettingsRow>

			<PongSettingsRow
				v-if="skillsEnabled"
				clickable
				:title="i18n.baseText('settings.context.skills.title')"
				:description="i18n.baseText('settings.context.skills.subtitle')"
				data-test-id="settings-context-skills-row"
				@click="openSkills"
			>
				<template #action>
					<PongSettingsRowConfigure :value="skillCount" />
				</template>
			</PongSettingsRow>
			<PongSettingsRow
				v-else
				:title="i18n.baseText('settings.context.skills.title')"
				:description="i18n.baseText('settings.context.comingSoon')"
				data-test-id="settings-context-skills-row"
			/>

			<PongSettingsRow
				:title="i18n.baseText('settings.context.sources.title')"
				:description="i18n.baseText('settings.context.comingSoon')"
				data-test-id="settings-context-sources-row"
			/>
		</PongSettingsRowGroup>
	</PongSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}
</style>
