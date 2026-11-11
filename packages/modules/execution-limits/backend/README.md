# @pong/backend-module-execution-limits

Backend feature module. The pong runtime loads the module through the lazy import in
`packages/cli/src/modules/modules.manifest.ts`.

```bash
pnpm turbo typecheck --filter=@pong/backend-module-execution-limits
pnpm turbo lint --filter=@pong/backend-module-execution-limits
pnpm turbo test --filter=@pong/backend-module-execution-limits
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
