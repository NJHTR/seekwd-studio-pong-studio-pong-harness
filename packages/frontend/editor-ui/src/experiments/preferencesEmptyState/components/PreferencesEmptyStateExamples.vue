<script lang="ts" setup>
import { useI18n } from '@pong/i18n';
import { PongButton, PongCard, PongHeading, PongIcon, PongText } from '@pong/design-system';

import {
	PREFERENCE_EXAMPLE_CARDS,
	type PreferenceExample,
	type PreferenceExampleCard,
} from '../preferenceExamples';

const emit = defineEmits<{
	'use-example': [example: PreferenceExample];
	'write-own': [];
}>();

const i18n = useI18n();

function useExample(card: PreferenceExampleCard) {
	emit('use-example', { id: card.id, content: i18n.baseText(card.contentKey) });
}
</script>

<template>
	<div :class="$style.emptyState" data-test-id="preferences-empty-state-examples">
		<PongHeading tag="h2" size="medium" bold>
			{{ i18n.baseText('experiments.preferencesEmptyState.examples.title') }}
		</PongHeading>
		<PongText color="text-light" :class="$style.description">
			{{ i18n.baseText('experiments.preferencesEmptyState.examples.description') }}
		</PongText>
		<ul :class="$style.grid">
			<li v-for="card in PREFERENCE_EXAMPLE_CARDS" :key="card.id">
				<PongCard :class="$style.card" :data-test-id="`preferences-example-${card.id}`">
					<template #header>
						<span :class="$style.category">
							<span :class="$style.categoryIcon">
								<PongIcon :icon="card.icon" size="small" />
							</span>
							<PongText size="small" color="text-base">
								{{ i18n.baseText(card.categoryKey) }}
							</PongText>
						</span>
					</template>
					<PongText tag="p" color="text-dark" :class="$style.content">
						{{ i18n.baseText(card.contentKey) }}
					</PongText>
					<template #footer>
						<PongText size="small" color="text-light" :class="$style.scope">
							<PongIcon icon="user" size="small" />
							{{ i18n.baseText('experiments.preferencesEmptyState.examples.scope') }}
						</PongText>
						<PongButton
							variant="outline"
							size="small"
							data-test-id="preferences-example-use-button"
							@click="useExample(card)"
						>
							{{ i18n.baseText('experiments.preferencesEmptyState.examples.use') }}
						</PongButton>
					</template>
				</PongCard>
			</li>
		</ul>
		<PongButton
			variant="solid"
			data-test-id="preferences-empty-state-write-own"
			@click="emit('write-own')"
		>
			<PongIcon icon="plus" />
			{{ i18n.baseText('experiments.preferencesEmptyState.writeOwn') }}
		</PongButton>
	</div>
</template>

<style lang="scss" module>
.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
	text-align: center;
}

.description {
	max-width: 34rem;
}

.grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--xs);
	width: 100%;
	max-width: 48rem;
	margin: var(--spacing--xs) 0;
	padding: 0;
	list-style: none;
	text-align: left;
}

.card {
	height: 100%;
	align-items: stretch;
}

.category {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.categoryIcon {
	display: grid;
	place-items: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	border: var(--border);
	border-radius: var(--radius--3xs);
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
}

.content {
	flex: 1;
	padding: var(--spacing--2xs) 0 var(--spacing--sm);
}

.scope {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
