// Use subpath entries to avoid loading all components in the preview.
import { IconBodyLoaderKey, loadLucideIconBody } from '@pong/design-system/icons/lucide';
import { PongPlugin } from '@pong/design-system/plugin';
import { i18nInstance } from '@pong/i18n';
import { DecoratorHelpers } from '@storybook/addon-themes';
import { setup, type Decorator } from '@storybook/vue3';
import ElementPlus from 'element-plus';
// @ts-expect-error no types
import lang from 'element-plus/dist/locale/en.mjs';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

import { applyPongTheme } from './applyPongTheme';
import { ThemedDocsContainer } from './ThemedDocsContainer';
import './storybook.scss';

const { initializeThemeState, pluckThemeFromContext } = DecoratorHelpers;

const THEME_NAMES = ['light', 'dark'] as const;
const DEFAULT_THEME = 'light';

initializeThemeState([...THEME_NAMES], DEFAULT_THEME);

function themeOverrideFromParameters(parameters: Record<string, unknown>): string | undefined {
	const themes = parameters.themes;
	if (typeof themes !== 'object' || themes === null || !('themeOverride' in themes)) {
		return undefined;
	}

	const override = themes.themeOverride;
	return typeof override === 'string' ? override : undefined;
}

function hasAppliedTheme(): boolean {
	const current = document.body.dataset.theme;
	return current === 'light' || current === 'dark';
}

setup((app) => {
	app.provide(IconBodyLoaderKey, loadLucideIconBody);

	const pinia = createPinia();
	app.use(pinia);
	app.use(i18nInstance);

	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/:catchAll(.*)', component: { template: '' } }],
	});
	app.use(router);

	app.use(ElementPlus, {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- element-plus locale .mjs ships no types
		locale: lang,
	});

	app.use(PongPlugin, {});
});

export const parameters = {
	controls: {
		matchers: {
			color: /(background|color)$/i,
			date: /Date$/,
		},
	},
	backgrounds: {
		disable: true,
	},
	options: {
		storySort: {
			method: 'alphabetical',
			order: ['Style Guide', 'Core', 'Areas', 'Experimental'],
			includeNames: false,
		},
	},
	docs: {
		container: ThemedDocsContainer,
	},
};

const withPongTheme: Decorator = (storyFn, context) => {
	const selected = pluckThemeFromContext(context);
	const theme =
		themeOverrideFromParameters(context.parameters) ?? (selected?.length ? selected : undefined);

	// Docs remounts every embedded story on a toolbar change. Those stories can
	// render before `globals.theme` is set; falling back to light paints the
	// page white after it already went dark.
	if (theme) {
		applyPongTheme(theme);
	} else if (!hasAppliedTheme()) {
		applyPongTheme(DEFAULT_THEME);
	}

	return storyFn();
};

export const decorators = [withPongTheme];

export const tags = ['autodocs'];
