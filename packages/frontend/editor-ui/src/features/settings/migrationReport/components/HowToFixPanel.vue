<script lang="ts" setup>
import type { BreakingChangeRecommendation } from '@pong/api-types';
import { PongCallout, PongLink, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import { BREAKING_CHANGES_DOCUMENTATION_URL } from '../constants';

defineOptions({ name: 'HowToFixPanel' });

const props = defineProps<{
	recommendations: BreakingChangeRecommendation[];
	// The rule's own docs page. Falls back to the general breaking-changes docs.
	documentationUrl?: string;
	// True when the table offers a "Migrate" action for this rule.
	migratable: boolean;
}>();

const i18n = useI18n();

const fallbackDocumentationUrl = computed(
	() => props.documentationUrl ?? BREAKING_CHANGES_DOCUMENTATION_URL,
);
</script>

<template>
	<PongCallout
		theme="info"
		icon="lightbulb"
		:class="$style.callout"
		data-test-id="migration-rule-how-to-fix"
	>
		<div :class="$style.body">
			<PongText tag="h3" size="small" bold color="text-dark">
				{{ i18n.baseText('settings.migrationReport.detail.howToFix.title') }}
			</PongText>

			<ul v-if="recommendations.length" :class="$style.list">
				<li v-for="(rec, index) in recommendations" :key="index" :class="$style.item">
					<PongText size="small" bold color="text-dark">{{ rec.action }}</PongText>
					<PongText size="small" color="text-base">{{ rec.description }}</PongText>
				</li>
			</ul>

			<PongText v-else size="small" color="text-base">
				<I18nT
					keypath="settings.migrationReport.detail.howToFix.fallback"
					tag="span"
					scope="global"
				>
					<template #link>
						<PongLink
							theme="text"
							:href="fallbackDocumentationUrl"
							target="_blank"
							rel="noopener noreferrer"
							data-test-id="migration-rule-how-to-fix-docs-link"
						>
							<span :class="$style.underlinedText">{{
								i18n.baseText('settings.migrationReport.detail.howToFix.fallback.link')
							}}</span>
						</PongLink>
					</template>
				</I18nT>
			</PongText>

			<PongText
				v-if="migratable"
				size="small"
				color="text-base"
				data-test-id="migration-rule-how-to-fix-migratable"
			>
				{{ i18n.baseText('settings.migrationReport.detail.howToFix.migratable') }}
			</PongText>
		</div>
	</PongCallout>
</template>

<style lang="scss" module>
// The callout centers its icon, but this panel has several lines, so the icon goes to the top.
.callout > div {
	align-items: flex-start;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.list {
	list-style-type: disc;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.item {
	display: flex;
	flex-direction: column;
}

.underlinedText {
	text-decoration: underline;
}
</style>
