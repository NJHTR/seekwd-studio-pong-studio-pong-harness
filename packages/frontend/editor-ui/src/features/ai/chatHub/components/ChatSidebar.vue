<script lang="ts" setup>
import { nextTick, computed } from 'vue';
import { useI18n } from '@pong/i18n';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { type IMenuItem, PongResizeWrapper } from '@pong/design-system';
import { useSettingsItems } from '@/app/composables/useSettingsItems';
import { useKeybindings } from '@/app/composables/useKeybindings';
import {
	MAX_SIDEBAR_WIDTH,
	MIN_SIDEBAR_WIDTH,
	useSidebarLayout,
} from '@/app/composables/useSidebarLayout';
import { PongScrollArea } from '@pong/design-system';
import BottomMenu from '@/app/components/BottomMenu.vue';
import MainSidebarHeader from '@/app/components/MainSidebarHeader.vue';
import ChatSidebarContent from '@/features/ai/chatHub/components/ChatSidebarContent.vue';

const i18n = useI18n();
const router = useRouter();

const {
	isCollapsed,
	isResizing,
	sidebarWidth,
	onResizeStart,
	onResize,
	onResizeEnd,
	toggleCollapse,
} = useSidebarLayout();

function openCommandBar(event: MouseEvent) {
	event.stopPropagation();

	void nextTick(() => {
		const keyboardEvent = new KeyboardEvent('keydown', {
			key: 'k',
			code: 'KeyK',
			metaKey: true,
			bubbles: true,
			cancelable: true,
		});
		document.dispatchEvent(keyboardEvent);
	});
}

const { settingsItems, settingsSections, handleSettingsItemSelect } = useSettingsItems();

const mainMenuItems = computed<IMenuItem[]>(() => [
	{
		id: 'settings',
		label: i18n.baseText('mainSidebar.settings'),
		icon: 'settings',
		available: true,
		children: settingsItems.value,
	},
]);

const visibleMenuItems = computed<IMenuItem[]>(() =>
	mainMenuItems.value.filter((item) => item.available !== false),
);

useKeybindings({
	['bracketleft']: () => toggleCollapse(),
});

const onLogout = () => {
	void router.push({ name: VIEWS.SIGNOUT });
};
</script>

<template>
	<PongResizeWrapper
		id="side-menu"
		:class="{
			[$style.sideMenu]: true,
			[$style.sideMenuCollapsed]: isCollapsed,
			[$style.sideMenuResizing]: isResizing,
		}"
		:width="sidebarWidth"
		:style="isCollapsed ? {} : { width: `${sidebarWidth}px` }"
		:supported-directions="['right']"
		:min-width="MIN_SIDEBAR_WIDTH"
		:max-width="MAX_SIDEBAR_WIDTH"
		:grid-size="8"
		@resizestart="onResizeStart"
		@resize="onResize"
		@resizeend="onResizeEnd"
	>
		<MainSidebarHeader
			hide-create
			:is-collapsed="isCollapsed"
			@collapse="toggleCollapse"
			@open-command-bar="openCommandBar"
		/>
		<PongScrollArea as-child>
			<div :class="$style.scrollArea">
				<ChatSidebarContent :is-collapsed="isCollapsed" />
				<BottomMenu
					:items="visibleMenuItems"
					:settings-sections="settingsSections"
					:is-collapsed="isCollapsed"
					@select="handleSettingsItemSelect"
					@logout="onLogout"
				/>
			</div>
		</PongScrollArea>
	</PongResizeWrapper>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

.sideMenu {
	position: relative;
	height: 100%;
	display: flex;
	flex-direction: column;
	border-right: var(--border);
	background-color: var(--menu--color--background, var(--color--background--light-2));
	transition: width var(--duration--snappy) var(--easing--ease-out);
	will-change: width;

	&.sideMenuCollapsed {
		width: $sidebar-width;
		min-width: auto;
	}

	&.sideMenuResizing {
		transition: none;
	}
}

.scrollArea {
	height: 100%;
	display: flex;
	flex-direction: column;
}
</style>
