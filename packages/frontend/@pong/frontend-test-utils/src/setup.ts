// The jsdom harness — observers, matchMedia, canvas, timers, teardown guards.
import '@pong/vitest-config/setup/frontend';

import { loadLanguage, type LocaleMessages } from '@pong/i18n';
import englishBaseText from '@pong/i18n/locales/en.json';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach } from 'vitest';

/**
 * The framework boot every frontend package repeats: english messages, and a fresh pinia per test.
 *
 * `@pong/vitest-config` cannot host this. `@pong/i18n` devDepends on it, so importing i18n from the
 * shared harness closes a cycle in the turbo graph. Nothing imports this package back, so it can
 * hold what the harness cannot.
 *
 * `useI18n()` reads a module-level singleton, so `loadLanguage` runs once at import and needs no
 * app instance. Without it `baseText` returns the key itself. The strings are the central
 * `en.json`; per-module locales are a later wave.
 *
 * Use it from a package's vitest setup file:
 * `import '@pong/frontend-test-utils/setup';`
 */
loadLanguage('en', englishBaseText as unknown as LocaleMessages);

beforeEach(() => {
	setActivePinia(createPinia());
});
