# @pong/frontend-module-inbox

The shared Inbox lists workflow reviews and saved Assistant results. Review details, comments, and decisions live in `src/reviews`. The editor supplies the workflow diff renderer and Assistant chat handoff through the SDK. Backend services keep their existing access rules and actions.

Open has two groups: Waiting for review and Authored by you. Assistant results go
in Waiting for review. Each group has its own cursor, Load more button, and retry.
Closed is a flat list with infinite scroll. Group collapse state persists per user.

Review decisions update the loaded rows and counts in place. Approving a selected
review opens the Closed tab, as before.

Assistant details live in `src/self-healing`. They show saved reports, workflow
changes, review activity, and usage. Result actions use the existing self-healing
API. Actions are available only while a result is open.
Fix ready shows Discard and close beside a Review menu: Apply and publish,
Continue with Assistant, and Continue with Editor.
Needs attention shows Discard and close beside a Continue in… menu with Continue
with Assistant and Continue with Editor. It has no publish action.
When a result has a suggestion, both menus show a note that tells what
continuing does.
Could not fix closes automatically and shows no actions.
Continuation applies a suggestion to the workflow draft, or dismisses a result
without one. It does not publish. The first successful action closes the result.
The frontend then updates the Inbox and opens the destination.
Chat uses the normal frontend Assistant handoff to create a private thread in the
reviewer's personal project. A reviewer can lack read access to the result's
project. The frontend loads the personal project before it closes the result.
If the project cannot load, the result stays open. The handoff sends the full
report and workflow attachment to start an Assistant run. If changes were
applied, the message says they are already in the draft.
Navigation failure does not reopen the result or undo saved changes.
After a lost response, the frontend refreshes the result and shows an error.
The user can retry the action if the result is still open.
A refresh does not navigate or retry publication.
Publishing remains a separate action. Self-healing remains off by default.

Frontend feature module. Consumed from source by the editor-ui shell through
`src/app/modules.manifest.ts`; there is no build step and no `dist`.

Read the full guide at `packages/@pong/module-cli/frontend-module-guide.md`. It gives the
descriptor contract, the registration points and the known problems. This README gives a
summary only.

```bash
pnpm turbo typecheck --filter=@pong/frontend-module-inbox
pnpm turbo lint --filter=@pong/frontend-module-inbox
pnpm turbo lint:styles --filter=@pong/frontend-module-inbox
pnpm turbo test --filter=@pong/frontend-module-inbox
```

Go through turbo, not `pnpm --filter <pkg> typecheck`: this package is consumed
from source, and on a cold tree its platform dependencies have not been built
yet. Turbo builds them first; the bare pnpm form does not.

## Import rules

- Depend on foundation and platform packages only (`@pong/design-system`,
  `@pong/stores`, `@pong/composables`, `@pong/i18n`, `@pong/rest-api-client`,
  `@pong/api-types`, `@pong/permissions`, `@pong/frontend-constants`, `pong-workflow`,
  `@pong/frontend-module-sdk`). Never import another
  `@pong/frontend-module-*`, and never import `@/…` from the shell.
- `@pong/stores` and `@pong/composables` are **subpath-only** — import
  `@pong/stores/settings.store`, not `@pong/stores`.
- The no-cross-module rule is currently a convention: the shared tsconfig base
  omits sibling modules from `paths`, which blocks an accidental import but not
  a deliberate one (declaring the dependency makes it typecheck clean). The
  ESLint rule that actually enforces it is CAT-3692.

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
