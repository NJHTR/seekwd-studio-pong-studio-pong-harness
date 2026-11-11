<script setup lang="ts">
import type { AppResponse } from '@pong/api-types';
import { PongBadge, PongCard, PongIcon, PongText, PongTimeAgo } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { useRootStore } from '@pong/stores/useRootStore';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { APP_DETAIL_VIEW } from '../apps.constants';
import AppActions from './AppActions.vue';

const props = defineProps<{ app: AppResponse }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const i18n = useI18n();
const rootStore = useRootStore();

const isPublished = computed(() => props.app.publishedVersionId !== null);
const appRoute = computed(() => ({
	name: APP_DETAIL_VIEW,
	params: { projectId: props.app.projectId, appId: props.app.id },
}));
</script>

<template>
	<RouterLink :to="appRoute" :class="$style.link" data-test-id="app-card-link">
		<PongCard :class="$style.card" data-test-id="app-card">
			<template #prepend>
				<PongIcon icon="layout-template" size="large" />
			</template>
			<template #header>
				<PongText tag="h2" bold :class="$style.heading" data-test-id="app-card-name">
					{{ app.name }}
				</PongText>
			</template>
			<div :class="$style.description">
				<span>{{ app.namespace }}</span>
				<span>|</span>
				<span>{{ i18n.baseText(`apps.card.visibility.${app.visibility}`) }}</span>
				<span>|</span>
				<span>
					{{ i18n.baseText('apps.card.updated') }}
					<PongTimeAgo :date="app.updatedAt" :locale="rootStore.defaultLocale" />
				</span>
			</div>
			<template #append>
				<div :class="$style.actions" @click.stop.prevent>
					<PongBadge
						:variant="isPublished ? 'success' : 'outline'"
						data-test-id="app-card-publication"
					>
						{{ i18n.baseText(isPublished ? 'apps.card.published' : 'apps.card.draft') }}
					</PongBadge>
					<AppActions :app="app" @deleted="emit('deleted', $event)" />
				</div>
			</template>
		</PongCard>
	</RouterLink>
</template>

<style lang="scss" module>
.link {
	display: block;
	color: inherit;
	text-decoration: none;
}

.card {
	padding: 0 0 0 var(--spacing--sm);
	align-items: stretch;
	cursor: pointer;
}

.heading {
	font-size: var(--font-size--sm);
	word-break: break-word;
	padding: var(--spacing--sm) 0 0 var(--spacing--sm);
}

.description {
	min-height: var(--spacing--xl);
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.actions {
	display: flex;
	cursor: default;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-right: var(--spacing--sm);
}
</style>
