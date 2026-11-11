<script setup lang="ts">
import { PongButton, PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, onMounted, ref, watch } from 'vue';

import { useEvalCollectionsStore } from '../../evalCollections.store';
import { useEvaluationsLicense } from '../../composables/useEvaluationsLicense';

const props = defineProps<{
	workflowId: string;
	collectionId: string;
	// True once the collection's runs are all settled with ≥2 completed — i.e. the
	// backend can actually produce insights. Drives auto-generation on completion.
	ready: boolean;
}>();

const i18n = useI18n();
const store = useEvalCollectionsStore();
const license = useEvaluationsLicense();

const errored = ref(false);
const licenseChecked = ref(false);

const insights = computed(() => store.getInsights(props.collectionId));
const loading = computed(() => store.loadingInsights[props.collectionId] ?? false);

// Hidden entirely when the instance isn't entitled — a not-in-cohort state, not
// an error. Stay hidden until the license check resolves so an unlicensed user
// never sees the card flash in before it vanishes.
const hidden = computed(() => !licenseChecked.value || !license.isLicensed.value);

// Only render once there's something to show: the runs are ready (insights are
// generating/generated) or we already have a result/loading/error. A collection
// that never becomes ready (e.g. all runs errored) shows nothing rather than a
// permanent empty shell with a header and no body.
const showCard = computed(
	() => !hidden.value && (props.ready || !!insights.value || loading.value || errored.value),
);

const generatedTime = computed(() => {
	const iso = insights.value?.generatedAt;
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
});

const primaryRegression = computed(() => insights.value?.insights.regressions[0] ?? null);

async function load(forceRegenerate: boolean) {
	errored.value = false;
	try {
		await store.generateInsights(props.workflowId, props.collectionId, forceRegenerate);
	} catch {
		errored.value = true;
	}
}

// Generate once the runs are settled and there's nothing cached — covering both
// "opened an already-finished collection" and "runs finished while watching".
// Not tied to mount, so insights appear when the second run completes without a
// manual retry. `ready` only flips false→true once per collection, so this won't
// loop; a cached envelope or an in-flight load also short-circuits it.
async function maybeGenerate() {
	if (!licenseChecked.value || !license.isLicensed.value) return;
	if (!props.ready) return;
	if (store.getInsights(props.collectionId) || loading.value) return;
	await load(false);
}

onMounted(async () => {
	await license.ensureLicenseLoaded();
	licenseChecked.value = true;
	await maybeGenerate();
});

watch(
	() => props.ready,
	() => {
		void maybeGenerate();
	},
);
</script>

<template>
	<section v-if="showCard" :class="$style.card" data-test-id="compare-ai-insights">
		<header :class="$style.header">
			<div :class="$style.title">
				<PongIcon icon="wand-sparkles" size="small" />
				<PongText size="medium" bold>{{
					i18n.baseText('evaluation.compare.insights.title')
				}}</PongText>
				<PongText v-if="generatedTime" size="xsmall" color="text-light">
					{{
						i18n.baseText('evaluation.compare.insights.generatedAt', {
							interpolate: { time: generatedTime },
						})
					}}
				</PongText>
			</div>
		</header>

		<div v-if="loading" :class="$style.takeaways" data-test-id="compare-ai-insights-loading">
			<div v-for="n in 3" :key="n" :class="[$style.takeaway, $style.skeleton]" />
		</div>

		<div v-else-if="errored" :class="$style.errorCard" data-test-id="compare-ai-insights-error">
			<PongText size="small" color="text-base">
				{{ i18n.baseText('evaluation.compare.insights.error') }}
			</PongText>
			<PongButton
				variant="outline"
				size="small"
				:label="i18n.baseText('evaluation.compare.insights.retry')"
				@click="load(true)"
			/>
		</div>

		<template v-else-if="insights">
			<div :class="$style.takeaways">
				<article :class="[$style.takeaway, $style.winner]">
					<span :class="[$style.badge, $style.badgeSuccess]">
						<PongIcon icon="circle-check" size="small" />
					</span>
					<PongText size="xsmall" bold color="text-light">
						{{ i18n.baseText('evaluation.compare.insights.winner') }}
					</PongText>
					<PongText size="small" bold>{{ insights.insights.winner.headline }}</PongText>
					<PongText size="xsmall" color="text-base">{{ insights.insights.winner.body }}</PongText>
				</article>

				<article :class="[$style.takeaway, primaryRegression ? $style.regression : $style.neutral]">
					<span
						:class="[$style.badge, primaryRegression ? $style.badgeDanger : $style.badgeSuccess]"
					>
						<PongIcon :icon="primaryRegression ? 'triangle-alert' : 'circle-check'" size="small" />
					</span>
					<PongText size="xsmall" bold color="text-light">
						{{ i18n.baseText('evaluation.compare.insights.regression') }}
					</PongText>
					<template v-if="primaryRegression">
						<PongText size="small" bold>{{ primaryRegression.headline }}</PongText>
						<PongText size="xsmall" color="text-base">{{ primaryRegression.body }}</PongText>
					</template>
					<PongText v-else size="small" color="text-base">
						{{ i18n.baseText('evaluation.compare.insights.noRegressions') }}
					</PongText>
				</article>

				<article :class="[$style.takeaway, $style.next]">
					<span :class="[$style.badge, $style.badgeInfo]">
						<PongIcon icon="arrow-right" size="small" />
					</span>
					<PongText size="xsmall" bold color="text-light">
						{{ i18n.baseText('evaluation.compare.insights.suggestedNext') }}
					</PongText>
					<PongText size="small" bold>{{ insights.insights.suggestedNext.headline }}</PongText>
					<PongText size="xsmall" color="text-base">{{
						insights.insights.suggestedNext.body
					}}</PongText>
				</article>
			</div>

			<PongText
				v-if="insights.status === 'fallback'"
				size="xsmall"
				color="text-light"
				:class="$style.fallbackNote"
			>
				{{ i18n.baseText('evaluation.compare.insights.fallbackNote') }}
			</PongText>
		</template>
	</section>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	padding: var(--spacing--md) var(--spacing--lg);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.title {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.takeaways {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--sm);
}

.takeaway {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border-radius: var(--radius);
	border: 1px solid var(--border-color--subtle);
}

.winner {
	background: var(--callout--color--background--success);
}

.regression {
	background: var(--callout--color--background--danger);
}

.next {
	background: var(--callout--color--background--info);
}

.neutral {
	background: var(--background--subtle);
}

.badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	border-radius: var(--radius--full);
	margin-bottom: var(--spacing--3xs);
	background: var(--background--surface);
}

.badgeSuccess {
	color: var(--icon-color--success);
}

.badgeDanger {
	color: var(--icon-color--danger);
}

.badgeInfo {
	color: var(--icon-color--info);
}

.skeleton {
	height: 96px;
	background: var(--background--subtle);
	border-color: transparent;
}

.errorCard {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) var(--spacing--md);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.fallbackNote {
	font-style: italic;
}
</style>
