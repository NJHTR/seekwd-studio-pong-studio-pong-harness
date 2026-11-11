# @pong/frontend-test-utils

The vue-aware test helpers every frontend package needs: a component renderer, `mockedStore`, the
`defaultSettings` fixture, and a vitest setup entry that boots i18n and pinia.

Private, source-only, test-only. Nothing in the shipped bundle imports it.

## Why it exists

`@pong/vitest-config` is the shared vitest harness, and it must not import `vue`, `pinia` or
`@pong/i18n`: backend packages consume it too, and `@pong/i18n` devDepends on it, so an import of
i18n there closes a cycle in the turbo graph. The vue-aware helpers had nowhere to live, so each
new module package copied them. This package is that home.

## Layer

L1 — beside `@pong/design-system` and `@pong/i18n`, below `@pong/stores` and `@pong/composables`.

It may import `vue`, `pinia`, `@pinia/testing`, `@testing-library/*`, `vitest`, `lodash`,
`@pong/api-types`, `@pong/i18n` and `@pong/design-system`. It may not import `@pong/stores`,
`@pong/composables`, any `@pong/frontend-module-*`, or the shell's `@/*`. The `paths` in
`tsconfig.json` enforce this structurally; `eslint.config.mjs` repeats it with the reason.

The rule runs the other way too: **no package this one imports may import it back.** Converging
`@pong/design-system`'s own renderer onto this package would close that cycle, so that stays a
separate decision.

## Use

```ts
// vitest setup file
import '@pong/frontend-test-utils/setup';
```

```ts
import { createComponentRenderer, mockedStore } from '@pong/frontend-test-utils';

const renderComponent = createComponentRenderer(MyView);
```

The zero-config renderer installs i18n, pinia, the design system, a `RouterLink` stub and a no-op
`$telemetry`. A consumer that needs more calls `defineRenderer` with its own plugins, stubs and
`provide` thunk, rather than adding a flag here — see `editor-ui/src/__tests__/render.ts`, which
adds the editor-core workflow document store.
