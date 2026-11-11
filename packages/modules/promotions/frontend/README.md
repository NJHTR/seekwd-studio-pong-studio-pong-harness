# @pong/frontend-module-promotions

Frontend feature module. Consumed from source by the editor-ui shell through
`src/app/modules.manifest.ts`; there is no build step and no `dist`.

Read the full guide at `packages/@pong/module-cli/frontend-module-guide.md`. It gives the
descriptor contract, the registration points and the known problems. This README gives a
summary only.

## Two entry points

- `@pong/frontend-module-promotions`: constants, the event bus and lazy component
  loaders, for shell files.
- `@pong/frontend-module-promotions/promotions.module`: the descriptor, for
  `modules.manifest.ts` only.

The descriptor reads `RouterView` and other values when it loads. Keep it out of
the main entry. Then a shell file that imports a constant does not load the
routes, and shell tests that mock `vue-router` do not fail.

```bash
pnpm turbo typecheck --filter=@pong/frontend-module-promotions
pnpm turbo lint --filter=@pong/frontend-module-promotions
pnpm turbo lint:styles --filter=@pong/frontend-module-promotions
pnpm turbo test --filter=@pong/frontend-module-promotions
```

Go through turbo, not `pnpm --filter <pkg> typecheck`: this package is consumed
from source, and on a cold tree its platform dependencies have not been built
yet. Turbo builds them first; the bare pnpm form does not.

## Import rules

- Depend only on the packages that the guide lists in "Imports and boundaries".
  Never import another `@pong/frontend-module-*`, and never import `@/…` from
  the shell.
- `@pong/stores` and `@pong/composables` are **subpath-only** — import
  `@pong/stores/settings.store`, not `@pong/stores`.
- The no-cross-module rule is currently a convention: the shared tsconfig base
  omits sibling modules from `paths`, which blocks an accidental import but not
  a deliberate one (declaring the dependency makes it typecheck clean). No lint
  rule enforces it yet, so reviewers do. CAT-3692 tracks the ESLint rule.

## Adding UI

`vite.config.ts` already carries the three plugins a design-system consumer
needs, so a `.vue` file compiles in tests without further setup:

- `@vitejs/plugin-vue` — single-file components.
- `unplugin-icons` — the `~icons/lucide/*` virtual modules behind `PongIcon`.
- `vite-svg-loader` — design-system's `custom/*.svg` icon components. Without
  it an `.svg` import is a data-URI string, which Vue renders as a tag name.

`src/__tests__/design-system-icons.test.ts` renders one icon of each kind, so a
plugin dropped from `vite.config.ts` fails this package's own suite. Keep that
test while the module renders any design-system component.

SCSS goes in a scoped `<style lang="scss">` block, with tokens from
design-system — `stylelint.config.mjs` holds this package to the same rules the
shell uses. Route components must load lazily.
