<script lang="ts" setup>
import { onMounted } from 'vue';
import { ABOUT_MODAL_KEY } from '@/app/constants';

import { PongIcon, PongLink, PongMenuItem, PongScrollArea, PongText } from '@pong/design-system';
import { useSettingsItems } from '../composables/useSettingsItems';
import { useAiGateway } from '../composables/useAiGateway';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import { useUIStore } from '../stores/ui.store';

const emit = defineEmits<{
	return: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();

const { settingsSections, handleSettingsItemSelect } = useSettingsItems();
const { fetchWallet, isEnabled } = useAiGateway();

onMounted(() => {
	if (isEnabled.value) void fetchWallet();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.returnBar">
			<div :class="$style.returnButton" data-test-id="settings-back" @click="emit('return')">
				<div :class="$style.arrowIcon">
					<PongIcon icon="arrow-left" size="small" />
				</div>
				<PongText bold>{{ i18n.baseText('settings') }}</PongText>
			</div>
		</div>
		<!-- The back link stays put; only the links scroll, with faded edges showing there is more. -->
		<PongScrollArea edge-fade="y" :class="$style.scrollArea" data-test-id="settings-sidebar-scroll">
			<div :class="$style.items">
				<div
					v-for="section in settingsSections"
					:key="section.id"
					:class="$style.section"
					:data-test-id="`settings-section-${section.id}`"
				>
					<PongText
						v-if="section.title"
						tag="div"
						size="small"
						bold
						color="text-light"
						:class="$style.sectionTitle"
					>
						{{ section.title }}
					</PongText>
					<PongMenuItem
						v-for="item in section.items"
						:key="item.id"
						:item="item"
						@click="handleSettingsItemSelect(item.id)"
					/>
				</div>
			</div>
			<div :class="$style.versionContainer">
				<PongLink size="small" @click="uiStore.openModal(ABOUT_MODAL_KEY)">
					{{ i18n.baseText('settings.version') }} {{ rootStore.versionCli }}
				</PongLink>
			</div>
		</PongScrollArea>
	</div>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

.container {
	min-width: $sidebar-expanded-width;
	height: 100%;
	background-color: var(--color--background--light-3);
	border-right: var(--border);
	position: relative;
	/* Grid rows are definite once sized, so the scroll area can fill the rest and scroll. */
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	overflow: hidden;
}

.scrollArea {
	min-height: 0;
}

.returnBar {
	/* Same horizontal inset as the links below, so the hover pill lines up with theirs. */
	padding: var(--spacing--2xs) var(--spacing--3xs);
	border-bottom: var(--border);
}

.returnButton {
	/* Mirrors the PongMenuItem box and hover so the back link reads as part of the list. */
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: var(--spacing--xl);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	cursor: pointer;

	.arrowIcon {
		display: grid;
		place-items: center;
		width: var(--spacing--lg);
		height: var(--spacing--lg);
	}

	&:hover {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
	}
}

.items {
	display: flex;
	flex-direction: column;

	padding: var(--spacing--xs) var(--spacing--3xs) 0;
}

.section {
	display: flex;
	flex-direction: column;

	& + & {
		margin-top: var(--spacing--xs);
	}
}

.sectionTitle {
	padding: var(--spacing--4xs) var(--spacing--3xs);
	margin-bottom: var(--spacing--5xs);
}

.versionContainer {
	/* Extra bottom space keeps the version clear of the browser's link preview bar. */
	padding: var(--spacing--xs) var(--spacing--xs) var(--spacing--xl);
}

@media screen and (max-height: 420px) {
	.versionContainer {
		display: none;
	}
}
</style>
