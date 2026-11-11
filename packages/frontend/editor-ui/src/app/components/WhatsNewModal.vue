<script setup lang="ts">
import dateformat from 'dateformat';
import { useI18n } from '@pong/i18n';
import { RELEASE_NOTES_URL, VERSIONS_MODAL_KEY, WHATS_NEW_MODAL_KEY } from '@/app/constants';
import { createEventBus } from '@pong/utils/event-bus';
import { useVersionsStore } from '@pong/stores/versions.store';
import { computed, nextTick, ref } from 'vue';
import { useTelemetry } from '@pong/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@pong/stores/users.store';
import Modal from '@/app/components/Modal.vue';

import {
	PongButton,
	PongCallout,
	PongHeading,
	PongIcon,
	PongLink,
	PongMarkdown,
	PongText,
	PongTooltip,
} from '@pong/design-system';
const props = defineProps<{
	modalName: string;
	data: {
		articleId: number;
	};
}>();

const articleRefs = ref<Record<number, HTMLElement>>({});
const pageRedirectionHelper = usePageRedirectionHelper();

const i18n = useI18n();
const modalBus = createEventBus();
const versionsStore = useVersionsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();

const nextVersions = computed(() => versionsStore.nextVersions);

const openUpdatesPanel = () => {
	uiStore.openModal(VERSIONS_MODAL_KEY);
};

const onUpdateClick = async () => {
	telemetry.track('User clicked on update button', {
		source: 'whats-new-modal',
	});

	await pageRedirectionHelper.goToVersions();
};

const scrollToItem = async (articleId: number) => {
	await nextTick(() => {
		const target = articleRefs.value[articleId];

		if (!target) return;

		target.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		});
	});
};

modalBus.on('opened', () => {
	versionsStore.closeWhatsNewCallout();

	// Mark all items as read when the modal is opened.
	// What's new articles on later weeks might contain partially same items,
	// but we only want to show the new ones as unread on the main sidebar.
	for (const item of versionsStore.whatsNewArticles) {
		if (!versionsStore.isWhatsNewArticleRead(item.id)) {
			versionsStore.setWhatsNewArticleRead(item.id);
		}
	}

	void scrollToItem(props.data.articleId);
});
</script>

<template>
	<Modal
		max-width="860px"
		max-height="85vh"
		:event-bus="modalBus"
		:name="WHATS_NEW_MODAL_KEY"
		:center="true"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.column">
					<div :class="$style.row">
						<PongIcon :icon="'bell'" :color="'primary'" :size="'large'" />
						<PongHeading size="xlarge">
							{{ versionsStore.whatsNew.title }}
						</PongHeading>
					</div>

					<div :class="$style.row">
						<PongHeading size="medium" color="text-light">{{
							dateformat(versionsStore.latestVersion.createdAt, `d mmmm, yyyy`)
						}}</PongHeading>
						<template v-if="versionsStore.hasVersionUpdates">
							<PongText :size="'medium'" :class="$style.text" :color="'text-base'">•</PongText>
							<PongLink
								size="medium"
								theme="primary"
								data-test-id="whats-new-modal-next-versions-link"
								@click="openUpdatesPanel"
							>
								{{
									i18n.baseText('whatsNew.versionsBehind', {
										interpolate: {
											count: nextVersions.length > 99 ? '99+' : nextVersions.length,
										},
									})
								}}
							</PongLink>
						</template>
					</div>
				</div>

				<PongTooltip
					v-if="versionsStore.hasVersionUpdates"
					:disabled="usersStore.canUserUpdateVersion"
					:content="i18n.baseText('whatsNew.updateNudgeTooltip')"
					placement="bottom"
				>
					<PongButton
						:size="'large'"
						:label="i18n.baseText('whatsNew.update')"
						:disabled="!usersStore.canUserUpdateVersion"
						data-test-id="whats-new-modal-update-button"
						@click="onUpdateClick"
					/>
				</PongTooltip>
			</div>
		</template>
		<template #content>
			<div :class="$style.container">
				<PongCallout
					v-if="versionsStore.hasSignificantUpdates"
					:class="$style.callout"
					theme="warning"
				>
					<slot name="callout-message">
						<PongText size="small">
							{{
								i18n.baseText('whatsNew.updateAvailable', {
									interpolate: {
										currentVersion: versionsStore.currentVersion?.name ?? 'unknown',
										latestVersion: versionsStore.latestVersion?.name,
										count: nextVersions.length,
									},
								})
							}}
							<PongLink
								:size="'small'"
								:underline="true"
								theme="primary"
								:to="RELEASE_NOTES_URL"
								target="_blank"
							>
								{{ i18n.baseText('whatsNew.updateAvailable.changelogLink') }}
							</PongLink>
						</PongText>
					</slot>
				</PongCallout>
				<div
					v-for="item in versionsStore.whatsNewArticles"
					:ref="
						(el: any) => {
							if (el) articleRefs[item.id] = el as HTMLElement;
						}
					"
					:key="item.id"
					:class="$style.article"
					:data-test-id="`whats-new-item-${item.id}`"
				>
					<PongHeading bold tag="h2" size="xlarge">
						{{ item.title }}
					</PongHeading>
					<PongMarkdown
						:content="item.content"
						:class="$style.markdown"
						:options="{
							markdown: {
								html: true,
								linkify: true,
								typographer: true,
								breaks: true,
							},
							tasklists: {
								enabled: false,
							},
							linkAttributes: {
								attrs: {
									target: '_blank',
									rel: 'noopener',
								},
							},
							youtube: {
								width: '100%',
								height: '315',
							},
						}"
					/>
				</div>
				<PongMarkdown
					v-if="versionsStore.whatsNew.footer"
					:content="versionsStore.whatsNew.footer"
					:class="$style.markdown"
					:options="{
						markdown: {
							html: true,
							linkify: true,
							typographer: true,
							breaks: true,
						},
						tasklists: {
							enabled: false,
						},
						linkAttributes: {
							attrs: {
								target: '_blank',
								rel: 'noopener',
							},
						},
						youtube: {
							width: '100%',
							height: '315',
						},
					}"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: var(--border);
	padding-bottom: var(--spacing--sm);
	padding-right: var(--spacing--xl);
}

:global(.el-dialog__header) {
	padding-bottom: var(--spacing--sm);
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
}

.container {
	margin-bottom: 0;

	// Collapse the trailing spacing of the last block (article or footer) and its innermost element
	> :last-child {
		margin-bottom: 0;
		padding-bottom: 0;

		:last-child {
			margin-bottom: 0;
		}
	}
}

.article {
	padding: var(--spacing--sm) 0;
}

.markdown {
	margin: var(--spacing--sm) 0;

	p,
	strong,
	em,
	s,
	code,
	a,
	li {
		font-size: var(--font-size--sm);
	}

	hr {
		margin-bottom: var(--spacing--sm);
	}

	img {
		margin: var(--spacing--sm) 0;
	}
}
</style>
