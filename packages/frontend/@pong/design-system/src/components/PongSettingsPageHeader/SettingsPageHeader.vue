<script setup lang="ts">
import { computed, useSlots, watchEffect } from 'vue';

import { useI18n } from '../../composables/useI18n';
import PongExternalLink from '../PongExternalLink';
import PongHeading from '../PongHeading';
import PongText from '../PongText';

export interface SettingsPageHeaderProps {
	/** Page title. */
	title: string;
	/** Optional 1-2 sentence description. */
	description?: string;
	/**
	 * Whether to render the inline documentation link at the end of the header. On by default
	 * so every settings page links to docs; set `:show-docs-link="false"` to remove it.
	 */
	showDocsLink?: boolean;
	/** Documentation link target. When omitted (while the link is shown) a dev warning fires. */
	docsUrl?: string;
	/** The underlined link word. Defaults to the localized "documentation". */
	docsLabel?: string;
	/**
	 * Leading copy rendered before the link word. Defaults to the localized "Learn more in the ";
	 * pass `""` when the description already leads into the link.
	 */
	docsLeadingText?: string;
	/** Heading element for the page title. */
	headingTag?: string;
}

defineOptions({ name: 'PongSettingsPageHeader' });

const props = withDefaults(defineProps<SettingsPageHeaderProps>(), {
	description: undefined,
	showDocsLink: true,
	docsUrl: undefined,
	docsLabel: undefined,
	docsLeadingText: undefined,
	headingTag: 'h1',
});

const slots = useSlots();
const { t } = useI18n();

const hasDescription = computed(() => Boolean(props.description || slots.description));

// `??` rather than `||`: an explicit empty leading text is a valid way to drop the lead-in.
const resolvedDocsLabel = computed(() => props.docsLabel ?? t('settingsPageHeader.docsLabel'));
const resolvedDocsLeadingText = computed(
	() => props.docsLeadingText ?? t('settingsPageHeader.docsLeadingText'),
);

// Default-on means a developer who forgets to wire a docs URL is nudged (not silently broken):
// the link word still renders as a placeholder and a dev-only warning prompts them to act.
// Without an href PongExternalLink falls back to a <button>, so the placeholder is rendered
// disabled: still visible as the nudge, but not a focusable no-op control.
if (import.meta.env.DEV) {
	watchEffect(() => {
		if (props.showDocsLink && !props.docsUrl) {
			console.warn(
				'[PongSettingsPageHeader] The docs link is enabled but no `docsUrl` was provided. ' +
					'Set `docs-url` to your documentation page, or pass `:show-docs-link="false"` to remove it.',
			);
		}
	});
}
</script>

<template>
	<header :class="$style.header">
		<div v-if="slots.titleTrailing" :class="$style.titleRow">
			<PongHeading :tag="headingTag" :class="$style.title" step="xl" color="text-dark">
				{{ title }}
			</PongHeading>
			<slot name="titleTrailing" />
		</div>
		<PongHeading v-else :tag="headingTag" :class="$style.title" step="xl" color="text-dark">
			{{ title }}
		</PongHeading>
		<p v-if="hasDescription || showDocsLink" :class="$style.description">
			<slot name="description">
				<PongText v-if="description" size="medium" color="text-base">{{ description }}</PongText>
			</slot>
			<!--
				The separating space sits OUTSIDE the nowrap docs phrase so the whole "leading copy +
				link + icon" can wrap to the next line as a single unit; only added after a description.
				The link sits inside the PongText so it inherits the description's font and line height.
			-->
			<template v-if="showDocsLink"
				>{{ hasDescription ? ' ' : ''
				}}<PongText size="medium" color="text-base" :class="$style.docsPhrase"
					>{{ resolvedDocsLeadingText
					}}<PongExternalLink
						inline
						size="small"
						:href="docsUrl || undefined"
						:disabled="docsUrl ? undefined : true"
						data-test-id="settings-page-header-docs"
						>{{ resolvedDocsLabel }}</PongExternalLink
					></PongText
				></template
			>
		</p>
	</header>
</template>

<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
	/* The header column stays capped even when the layout content is full-width. */
	max-width: var(--settings-content--max-width, 45rem);
	/*
	 * The 48px gap to the content below is owned and enforced by PongSettingsLayout
	 * (`.content > header + *`), not by an external margin here, so it stays deterministic
	 * and never relies on margin-collapsing.
	 */
}

.title {
	letter-spacing: var(--letter-spacing--tight);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.description {
	margin: 0;
	display: inline;
	/* Intentionally the standard body line-height (lg). */
	line-height: var(--line-height--lg);
}

/* The inline PongText pieces already use the body line-height (lg); keep them consistent. */
.description :global(.pong-text) {
	line-height: var(--line-height--lg);
}

/* Keeps "leading copy + link + icon" together so the docs sentence wraps as a single unit. */
.docsPhrase {
	white-space: nowrap;
}
</style>
