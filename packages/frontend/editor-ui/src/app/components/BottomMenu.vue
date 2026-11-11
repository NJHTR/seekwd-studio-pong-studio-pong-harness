<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	PongBadge,
	PongDropdownMenu,
	PongDropdownMenuItem,
	PongMenuItem,
	PongNewBadge,
	PongPopover,
	PongPreviewBadge,
	PongScrollArea,
	PongText,
	isCustomMenuItem,
	type DropdownMenuItemProps,
	type IMenuItem,
	type IMenuElement,
} from '@pong/design-system';
import { CHANGELOG_URL } from '@/app/constants';
import { useVersionsStore } from '@pong/stores/versions.store';
import VersionUpdateCTA from '@/app/components/VersionUpdateCTA.vue';
import { useUsersStore } from '@pong/stores/users.store';
import type { SettingsSectionGroup } from '@/app/composables/useSettingsItems';

import { useI18n } from '@pong/i18n';

const props = withDefaults(
	defineProps<{
		items: IMenuItem[];
		isCollapsed: boolean;
		/** Settings links grouped under their headings. Without it the `settings` item's children are listed flat. */
		settingsSections?: SettingsSectionGroup[];
	}>(),
	{ settingsSections: undefined },
);

const emit = defineEmits<{
	select: [key: string];
	logout: [];
}>();

const router = useRouter();
const versionsStore = useVersionsStore();
const usersStore = useUsersStore();

const i18n = useI18n();

const isHelpOpen = ref(false);
const isSettingsOpen = ref(false);

/** A settings row keeps its menu item in `data`, so the trailing slot can show its tags. */
type SettingsMenuEntry = DropdownMenuItemProps<string, IMenuItem>;

function toSettingsEntry(item: IMenuItem): SettingsMenuEntry {
	return {
		id: item.id,
		testId: item.id,
		label: item.label,
		icon: typeof item.icon === 'string' ? { type: 'icon', value: item.icon } : item.icon,
		disabled: item.disabled,
		data: item,
	};
}

const settingsEntries = computed<SettingsMenuEntry[]>(() => {
	if (props.settingsSections) {
		return props.settingsSections.flatMap((section) => [
			...(section.title
				? [{ id: `section-${section.id}`, label: section.title, header: true }]
				: []),
			...section.items.map(toSettingsEntry),
		]);
	}

	const settingsItem = props.items.find((item) => item.id === 'settings');
	return (settingsItem?.children ?? [])
		.filter((child): child is IMenuItem => !isCustomMenuItem(child))
		.map(toSettingsEntry);
});

// A menu row is not a link, so the row's route is followed here.
function handleSettingsSelect(key: string) {
	const item = settingsEntries.value.find((entry) => entry.id === key)?.data;
	if (item?.route?.to) {
		void router.push(item.route.to);
	} else if (item?.link) {
		window.open(item.link.href, item.link.target ?? '_self');
	}
	handleSelect(key);
}

const whatsNewItems = computed<{ available: boolean; children: IMenuElement[] }>(() => ({
	available: versionsStore.hasVersionUpdates || versionsStore.whatsNewArticles.length > 0,
	children: [
		...versionsStore.whatsNewArticles.map(
			(article) =>
				({
					id: `whats-new-article-${article.id}`,
					label: article.title,
					size: 'small',
					customIconSize: 'small',
					icon: {
						type: 'emoji',
						value: '•',
						color: !versionsStore.isWhatsNewArticleRead(article.id) ? 'primary' : 'text-light',
					},
				}) satisfies IMenuItem,
		),
		{
			id: 'full-changelog',
			icon: 'external-link',
			label: i18n.baseText('mainSidebar.whatsNew.fullChangelog'),
			link: {
				href: CHANGELOG_URL,
				target: '_blank',
			},
			size: 'small',
			customIconSize: 'small',
		},
		...(versionsStore.hasVersionUpdates
			? [
					{
						id: 'version-upgrade-cta',
						component: VersionUpdateCTA,
						props: {
							tooltipText: !usersStore.canUserUpdateVersion
								? i18n.baseText('whatsNew.updateNudgeTooltip')
								: undefined,
							disabled: !usersStore.canUserUpdateVersion,
						},
					},
				]
			: []),
	],
}));

function handleSelect(key: string) {
	emit('select', key);
}

function onLogout() {
	emit('logout');
}
</script>

<template>
	<div
		:class="{
			[$style.bottomMenu]: true,
			[$style.collapsed]: isCollapsed,
		}"
	>
		<div :class="$style.bottomMenuItems">
			<template v-for="item in items" :key="item.id">
				<!-- Help popover -->
				<PongPopover
					v-if="item.children && item.id === 'help'"
					key="help"
					v-model:open="isHelpOpen"
					side="right"
					align="end"
				>
					<template #content>
						<div :class="$style.popover">
							<template v-for="child in item.children" :key="child.id">
								<component
									:is="child.component"
									v-if="isCustomMenuItem(child)"
									v-bind="child.props"
								/>
								<PongMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
							</template>
							<template v-if="whatsNewItems.available">
								<PongText bold size="small" :class="$style.popoverTitle" color="text-light"
									>What's new</PongText
								>
								<template v-for="child in whatsNewItems.children" :key="child.id">
									<component
										:is="child.component"
										v-if="isCustomMenuItem(child)"
										v-bind="child.props"
									/>
									<PongMenuItem v-else :item="child" @click="() => handleSelect(child.id)" />
								</template>
							</template>
						</div>
					</template>
					<template #trigger>
						<PongMenuItem
							:data-test-id="`main-sidebar-${item.id}`"
							:item="item"
							:compact="isCollapsed"
							:active="isHelpOpen"
							@click="() => handleSelect(item.id)"
						/>
					</template>
				</PongPopover>
				<!-- Settings menu. The height cap keeps it from filling a tall screen; the links
				     scroll in their own area, with faded edges as a hint that they do, and Sign out
				     stays below it. On a short screen the available height wins. -->
				<PongDropdownMenu
					v-else-if="item.children && item.id === 'settings'"
					key="settings"
					v-model="isSettingsOpen"
					:items="settingsEntries"
					placement="right-end"
					max-height="min(530px, var(--reka-dropdown-menu-content-available-height))"
					:extra-popper-class="$style.settingsMenu"
					content-test-id="main-sidebar-settings-list"
				>
					<template #trigger>
						<!-- The menu item renders an anchor without href, which cannot take focus. The
						     role and tabindex land on its wrapper, next to the aria attributes Reka sets,
						     so the keyboard can open the menu and gets its focus back on close. -->
						<PongMenuItem
							:data-test-id="`main-sidebar-${item.id}`"
							:class="$style.menuTrigger"
							:item="item"
							:compact="isCollapsed"
							:active="isSettingsOpen"
							role="button"
							tabindex="0"
							@click="() => handleSelect(item.id)"
						/>
					</template>
					<template #content>
						<PongScrollArea edge-fade="y" :class="$style.settingsList">
							<div :class="$style.settingsItems" data-menu-items>
								<PongDropdownMenuItem
									v-for="entry in settingsEntries"
									:key="entry.id"
									v-bind="entry"
									@select="handleSettingsSelect"
								>
									<template #item-trailing="{ item: row, ui }">
										<PongPreviewBadge v-if="row.data?.preview" :class="ui.class" />
										<PongNewBadge v-if="row.data?.new" :class="ui.class" />
										<PongBadge
											v-if="row.data?.creditsTag"
											size="xxsmall"
											variant="success"
											:class="ui.class"
										>
											{{ row.data.creditsTag }}
										</PongBadge>
									</template>
								</PongDropdownMenuItem>
							</div>
						</PongScrollArea>
						<div :class="$style.settingsFooter" data-test-id="main-sidebar-settings-footer">
							<PongDropdownMenuItem
								id="sign-out"
								test-id="main-sidebar-log-out"
								:label="i18n.baseText('auth.signout')"
								:icon="{ type: 'icon', value: 'log-out' }"
								@select="onLogout"
							/>
						</div>
					</template>
				</PongDropdownMenu>
				<!-- Items without children -->
				<PongMenuItem
					v-else
					:data-test-id="`main-sidebar-${item.id}`"
					:item="item"
					:compact="isCollapsed"
					:class="item.id === 'resource-center' ? $style.resourceCenterMenuItem : undefined"
					@click="() => handleSelect(item.id)"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/focus';

.bottomMenu {
	display: flex;
	flex-direction: column;
	margin-top: auto;

	&.collapsed {
		border-top: var(--border);
	}
}

.bottomMenuItems {
	padding: var(--spacing--3xs);
}

.resourceCenterMenuItem {
	:global(.pong-text) {
		color: var(--color--primary);
	}
}

.popover {
	padding: var(--spacing--4xs);
	min-width: 260px;
}

.popoverTitle {
	display: block;
	margin-bottom: var(--spacing--3xs);
	padding-left: var(--spacing--3xs);
	margin-top: var(--spacing--xs);
}

/* The dropdown lays its trigger out inline, which shrinks the row to its label. */
.bottomMenuItems .menuTrigger {
	display: block;
	border-radius: var(--radius);

	/* Same ring as the menu item draws for itself, on the wrapper that holds focus here. */
	&:focus-visible {
		@include focus.focus-ring;
		outline-offset: -1px;
	}
}

/*
 * Doubled to outrank the menu's own scrolling. Grid rows are definite once sized, so the
 * scroll area fills the row above the footer and scrolls inside it.
 */
.settingsMenu.settingsMenu {
	display: grid;
	grid-template-rows: minmax(0, 1fr) auto;
	min-width: 260px;
	overflow: hidden;
}

.settingsList {
	min-height: 0;
}

/* Same inset and rhythm as the menu's own item list. */
.settingsItems {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs);
}

/* The border runs edge to edge because the footer sits outside the list inset. */
.settingsFooter {
	padding: var(--spacing--4xs);
	border-top: var(--border);
}
</style>
