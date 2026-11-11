// The shared jsdom harness — observers, matchMedia, canvas, timers, teardown guards.
import '@pong/vitest-config/setup/frontend';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach } from 'vitest';

// Framework boot stays per-package on purpose: `@pong/i18n` devDepends on
// `@pong/vitest-config`, so booting i18n from inside the shared harness would
// close a turbo build cycle. Add `useI18n` boot here if this module needs it.
beforeEach(() => {
	setActivePinia(createPinia());
});
