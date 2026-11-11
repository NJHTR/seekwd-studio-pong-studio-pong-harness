# @pong/backend-module-execution-ledger

Owns the `execution_ledger` table: one row when a run starts and one when it ends. Fold steps
from other modules read the rows through the contract in `@pong/db`. The module is opt-in: enable
it with `PONG_ENABLED_MODULES=execution-ledger`.

Every 5 seconds, the `execution-ledger-fold` system task claims a batch of rows and runs every
registered fold step on it, in one transaction with a savepoint for each step. When a step fails,
the whole batch rolls back and stays in the ledger. When no step is registered, the fold does not
claim rows.

The pong runtime loads the module through the lazy import in
`packages/cli/src/modules/modules.manifest.ts`.

```bash
pnpm turbo typecheck --filter=@pong/backend-module-execution-ledger
pnpm turbo lint --filter=@pong/backend-module-execution-ledger
pnpm turbo test --filter=@pong/backend-module-execution-ledger
pnpm --filter @pong/backend-module-execution-ledger test:postgres   # needs Docker
```

Go through Turbo. It builds this package's workspace dependencies first.

Read `scripts/backend-module/backend-module-guide.md` for the module lifecycle, REST controller,
service, repository, entity, configuration, and testing patterns.

## Import rules

- Do not import from `packages/cli` or from the `pong` package.
- Declare each workspace and third-party import in this package.
- Export APIs for other packages from `src/index.ts`.
- Keep the module entrypoint in the `./module` export. Do not export it from `src/index.ts`.
  Importing the entrypoint runs the `@BackendModule` decorator.
- Use dynamic imports inside the module entrypoint. This keeps disabled modules unloaded.
- Keep TypeORM imports in entity and repository files. A repository composes a
  file-private `BaseRepository` table and exposes only use-case methods. It does
  not extend `BaseRepository`.
