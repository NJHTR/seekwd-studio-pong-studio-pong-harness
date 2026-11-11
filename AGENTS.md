# AGENTS.md

This file provides guidance on how to work with the pong repository.

## Project Overview

pong is a workflow automation platform written in TypeScript, using a monorepo
structure managed by pnpm workspaces. It consists of a Node.js backend, Vue.js
frontend, and extensible node-based workflow engine.

## General Guidelines

- Always use pnpm
- Write all technical text (code comments, PR descriptions, issue and ticket
  descriptions, docs) in ASD-STE100 Simplified Technical English: use short
  sentences, the active voice, and one instruction for each sentence
- **JSDoc on `@Env(...)` config properties is public documentation.** The
  docs team exports these comments into the environment variable reference on
  docs.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness. Write them for a self-hosting operator and follow the
  `pong:env-var-docs` skill, which applies the pong docs style guide and
  overrides the ASD-STE100 rule above for these comments
- **Secrets on the command line:** if a developer opted into anonymous dev
  metrics (`scripts/dev-metrics`), pnpm command arguments are recorded. Arguments
  of secret-carrying words (`config`, `login`, `publish`, `token`) — whether a
  subcommand or baked into a flag — are dropped, and the home dir is stripped from
  paths, but other args are sent as-is — so never put secrets in a command. Pass
  sensitive values via environment variables, which are never captured.
- When adding comments, keep them concise and to the point - explain the "why"
  in a line or two; don't be overly verbose. Comments should be scoped and
  relevant to the surrounding code, not just to the current task
- We use Linear as a ticket tracking system
- We use Posthog for feature flags
- To find registered telemetry events (names, descriptions, properties), run
  `pnpm --filter @pong/telemetry catalog` (`--json` for structured output). The
  registry is being adopted incrementally, so search call sites if the catalog
  has no match. The `pong:telemetry` skill covers adding or changing events
- When starting to work on a new ticket – create a new branch from fresh
  master with the name specified in Linear ticket
- When creating a new branch for a ticket in Linear - use the branch name
  suggested by Linear, **unless it is a security fix** (see Security Fix
  Hygiene below)
- Use mermaid diagrams in MD files when you need to visualise something
- Write an ADR only when asked. When a change makes a decision that an
  engineer could challenge in 12 months, say so in one line and let the
  human decide. Read [docs/adr/README.md](docs/adr/README.md) before you
  write one. CI enforces its conventions
- **Developing v3 features:** land normal feature work on `master` behind an
  opt-in flag; introduce breaking changes only on the `3.x` branch. See
  [.github/DEVELOPING_V3.md](.github/DEVELOPING_V3.md).
- The AI gateway feature is **"Gateway credits"** in user-facing text (UI copy,
  error messages, prompts). Only internal identifiers, i18n keys, telemetry, and
  comments keep the historical `pongConnect` / `pong credits` / AI Gateway names
- **Shared utilities:** before you hand-roll a utility (`isRecord`, secret or
  PII redaction, JSON extraction from LLM output, Zod to JSON Schema, model-id
  parsing, AI client HTTP transport and response-size limiting, …), you MUST
  check the shared packages for an existing
  implementation and use it: `@pong/utils` (generic helpers, redaction),
  `@pong/ai-utilities` (AI- and LLM-specific helpers) and `pong-workflow`
  (workflow graph and traversal). A new shared helper usually belongs in one of
  these packages too; domain logic stays in the package that owns the domain.

## Agent Skills and Claude Code Plugin

pong shared skills live in `.agents/skills/`. Claude Code consumes them through
symlinks in `.claude/plugins/pong/skills/`; OpenCode reads `.agents/skills/`
directly. Harness-specific overrides remain real directories in the harness
path, such as `.opencode/skills/setup-mcps/`. See
[skills README](.agents/skills/AGENTS.md) for editing and sync guidance.

pong-specific Claude Code commands and agents live in `.claude/plugins/pong/` and
are namespaced under `pong:`. Use `pong:` prefix when invoking them (e.g.
`/pong:create-pr`, `/pong:plan`, `pong:developer` agent). See
[plugin README](.claude/plugins/pong/README.md) for structure and details.

## Essential Commands

For routine pre-commit checks, follow [Verify changes](#verify-changes).
For focused tests, use `pnpm agent:test` or `pnpm agent:playwright`.
Pass test files and worker limits after `--`. Run each command with `--help`
for its options.

`pnpm agent:lint` and `pnpm agent:typecheck` run full-repo checks by default.
With `--filter <package>`, they still check the whole package. These wrappers
save logs and reduce console output. They do not reduce CPU or memory use.
Do not use them as routine pre-commit checks.

### Fresh checkout / agent setup

For a fresh checkout (cat-bot, a new hire, any agent verifying the repo
builds), prefer `pnpm agent:setup` over running install + build + tests by
hand. It chains them in one process, caps per-process memory and turbo
concurrency so a 6GB box doesn't OOM, streams all output to
`.agent-setup/<step>.log` (gitignored), and surfaces only a one-line summary
per step plus the tail of the failing log. A machine-readable
`.agent-setup/summary.json` is always written so a backgrounded run is
readable in a single shot — no polling, no scrolling logs.

```bash
pnpm agent:setup                 # install → build → test (full suite)
pnpm agent:setup install         # one step at a time
pnpm agent:setup --json          # JSON summary on stdout (for scripts/agents)
```

### Building
Use `pnpm build` to build all packages. ALWAYS redirect the output of the
build command to a file:

```bash
pnpm build > build.log 2>&1
```

You can inspect the last few lines of the build log file to check for errors:
```bash
tail -n 20 build.log
```

If build outputs or the turbo cache are stale (e.g. after switching branches
or worktrees) but dependencies haven't changed, use `pnpm reset` (lightweight
by default) for a fast recovery: it cleans build outputs and force-rebuilds
(keeping `node_modules` and untracked files). If that doesn't fix your issue,
use `pnpm reset --full`, which also wipes untracked files and reinstalls
dependencies.

### Seeding a local instance

An empty instance is a bad place to test anything that reads a user's work.
These commands fill one. They are dev tooling on the private root package, so
they never reach a user.

```bash
PONG_API_KEY=<jwt> pnpm seed:preference   # 10 workflows in one house style, plus history
PONG_API_KEY=<jwt> pnpm seed:account      # ~500 varied workflows across 30 projects
pnpm inspect:activity                    # read-only activity_event viewer on 127.0.0.1
```

Both seed profiles delete their own prior output, so a re-run replaces it.
That clear step deletes anything named `[seed]` and any empty team project,
whoever made them, so do not point either at a shared instance. The viewer is
unauthenticated and serves the whole table: keep it on loopback.

See [scripts/instance-seeding/AGENTS.md](scripts/instance-seeding/AGENTS.md) for
profiles, tokens, determinism, and the other commands.

## Architecture Overview

**Monorepo Structure:** pnpm workspaces with Turbo build orchestration

### Package Structure

The monorepo is organized into these key packages:

- **`packages/@pong/api-types`**: Shared TypeScript interfaces between frontend and backend
- **`packages/workflow`**: Core workflow interfaces and types
- **`packages/core`**: Workflow execution engine
- **`packages/cli`**: Express server, REST API, and CLI commands
- **`packages/frontend/editor-ui`**: Vue 3 frontend application
- **`packages/frontend/@pong/i18n`**: Internationalization for UI text
- **`packages/nodes-base`**: Built-in nodes for integrations
- **`packages/@pong/nodes-langchain`**: AI/LangChain nodes
- **`packages/@pong/instance-ai`**: "pong Assistant" in the UI, "Instance AI" in code — pong Assistant backend. See its `CLAUDE.md` for architecture docs.
- **`@pong/design-system`**: Vue component library for UI consistency
- **`@pong/config`**: Centralized configuration management

## Technology Stack

- **Frontend:** Vue 3 + TypeScript + Vite + Pinia + Storybook UI Library
- **Backend:** Node.js + TypeScript + Express + TypeORM
- **Testing:** Vitest (unit) + Playwright (UI, API, infrastructure, lifecycle, performance, and E2E orchestration)
- **Database:** TypeORM with SQLite/PostgreSQL support
- **Code Quality:** Biome (for formatting) + ESLint + lefthook git hooks

### Key Architectural Patterns

1. **Dependency Injection**: Uses `@pong/di` for IoC container
2. **Controller-Service-Repository**: Backend follows MVC-like pattern
3. **Event-Driven**: Internal event bus for decoupled communication
4. **Context-Based Execution**: Different contexts for different node types
5. **State Management**: Frontend uses Pinia stores
6. **Design System**: Reusable components and design tokens are centralized in
   `@pong/design-system`, where all pure Vue components should be placed to
   ensure consistency and reusability

## Key Development Patterns

- Each package has isolated build configuration and can be developed independently
- Hot reload works across the full stack during development
- Node development uses dedicated `node-dev` CLI tool
- Workflow tests are JSON-based for integration testing
- AI features have dedicated development workflow (`pnpm dev:ai`)

### Workflow Traversal Utilities

The `pong-workflow` package exports graph traversal utilities from
`packages/workflow/src/common/`. Use these instead of custom traversal logic.

**Key concept:** `workflow.connections` is indexed by **source node**.
To find parent nodes, use `mapConnectionsByDestination()` to invert it first.

```typescript
import { getParentNodes, getChildNodes, mapConnectionsByDestination } from 'pong-workflow';

// Finding parent nodes (predecessors) - requires inverted connections
const connectionsByDestination = mapConnectionsByDestination(workflow.connections);
const parents = getParentNodes(connectionsByDestination, 'NodeName', 'main', 1);

// Finding child nodes (successors) - uses connections directly
const children = getChildNodes(workflow.connections, 'NodeName', 'main', 1);
```

### TypeScript Best Practices
- **NEVER use `any` type** - use proper types or `unknown`
- **Avoid type casting with `as`** - use type guards or type predicates instead (except in test code where `as` is acceptable)
- **Define shared interfaces in `@pong/api-types`** package for FE/BE communication
- **Lazy-load heavy modules** — if a module is only used in a specific code
  path (not every request), use `await import()` at point of use instead of
  top-level `import`. Applies especially to native modules and large parsers.

### Error Handling
- Don't use the deprecated `ApplicationError` class anywhere — it's a
  compatibility shim kept only so community nodes keep resolving. Use one of
  these instead, picking by cause:
  - `UserError` — the user caused it (invalid input, unauthorized action,
    business-rule violation).
  - `OperationalError` — a transient, expected issue (network request failing,
    DB query timing out) that should be handled gracefully.
  - `UnexpectedError` — a bug in the code (logic mistake, unhandled case,
    failed assertion) that developers need to fix.
- Import from appropriate error classes in each package

### Persistence layer & the TypeORM boundary

TypeORM (`@pong/typeorm`) must stay in the **persistence layer**. The shared
`@pong/db` package and backend persistence adapters can import it. A module can
colocate or group its entities and repositories according to its domain.
Business logic — services, controllers, handlers, commands, factories — must not
import from `@pong/typeorm` (including `@pong/typeorm/...` subpaths). The
`typeorm-persistence-boundary` Code Health rule recognizes entity and repository
declarations. It scans backend packages that depend on `@pong/db` or
`@pong/typeorm`. Tests, migrations, and explicit helper-only adapters are
exceptions. Existing business-logic imports stay in the shrink-only Code Health
baseline. A new business-logic import fails CI.

- **Pattern:** when a query needs operators (`In`, `IsNull`, `LessThan`,
  `FindOptionsWhere`, …), put it behind a **use-case-named repository method**
  that takes plain parameters and returns domain-shaped values — not a generic
  `find(options)` passthrough.
- **Transactions:** transaction orchestration belongs in the persistence layer.
  Don't reach for `.manager` / `.manager.transaction(...)` or
  `createQueryBuilder(...)` in business logic. Use the sanctioned primitive in
  `@pong/db`: inject the abstract `TransactionRunner` and wrap the unit of work in
  `txRunner.run(ctx, async (ctx) => …)`. The callback receives an
  `OperationContext` carrying the active transaction; thread that `ctx` into the
  repository methods you call. `run` **requires** a context — pass an empty `{}`
  at the operation entry point, and reuse the one you were handed everywhere
  below it (a context that already carries a transaction is joined, not nested).
  The `Transaction` handle is opaque and never exposes a driver type to
  business logic. See `oauth-token.service.ts` for a worked service example
  (its repositories predate the composition rule below; do not copy their shape).
- **Repositories compose, they don't extend.** A repository is the boundary
  that keeps TypeORM out of business logic. If it extended `BaseRepository`,
  every service that injects it would also get `find`, `save`, `delete`,
  `createQueryBuilder` and `.manager` for free, and TypeORM would leak through
  inferred types that no lint rule can see. So a repository is a plain
  `@Service()` class that holds a **file-private `BaseRepository` subclass (the
  table)** as a private field and resolves the manager with
  `this.table.managerFor(ctx)`. The table is never exported or registered with
  DI. Every data access is a named use-case method on the repository that
  calls the table internally; there is no generic `find`/`save`/`delete`
  unless you write it for one operation. See
  `packages/cli/src/modules/inbound-auth-core/database/repositories/trusted-source.repository.ts`
  for a worked example. The existing `extends BaseRepository` / `extends
  Repository` repositories are legacy. Do not copy them, and do not convert them
  in unrelated PRs. This rule is not yet lint-enforced.
- **Anti-patterns reviewers reject** — they hide the dependency instead of
  removing it:
  - String-matching TypeORM errors, e.g. `error.name === 'QueryFailedError'`.
  - Relabeling the import from `@pong/typeorm` to `@pong/db` to silence the rule
    (`@pong/db` re-exports several operators/types, but this relabels the
    dependency rather than removing it).
  - Pushing `.manager` / `createQueryBuilder` / `repo.managerFor(ctx)` into
    business logic to avoid an operator import — trades a visible leak for an
    invisible one.
  - A repository that `extends BaseRepository` / `extends Repository`, or that
    exposes its table (public property, getter, or a `find(options)`
    passthrough) — the inherited TypeORM surface must stay private to the table.

### ESLint configuration layers

Rule policy lives in four shared configs in `@pong/eslint-config`, and a package
config picks exactly one:

| layer | subpath | for |
|---|---|---|
| `baseConfig` | `@pong/eslint-config/base` | runtime-agnostic libraries |
| `backendConfig` | `@pong/eslint-config/backend` | anything that runs on Node; adds the network and encryption boundaries |
| `frontendConfig` | `@pong/eslint-config/frontend` | Vue packages |
| `nodesConfig` | `@pong/eslint-config/nodes` | `pong-nodes-base` and `@pong/nodes-langchain`; adds the node and credential file rules |

A package config may add `ignores`, an additive plugin config, a block that
raises rules to `error`, and blocks scoped to `files`. It must not turn a rule
down for the whole package: every lint script runs with `--quiet`, so a `warn`
enforces nothing and reads as if it did. The code-health rule
`lint-config-layering` enforces this, with existing debt in
`.code-health-baseline.json`, which only shrinks.

To stop enforcing a rule everywhere, retire it in `base.ts` with the count
behind the decision. To enforce one again in a package that is ready, set it to
`error` there. `node scripts/lint-parity/majority.mjs` prints how many packages
downgrade each rule, and `scripts/lint-parity/snapshot.mjs` plus `diff.mjs`
prove a config change only altered what you meant it to.

### Encryption boundary

New code encrypts and decrypts only through `cipher.encryptV2()` /
`cipher.decryptV2()` — the key-manager module decides which key is used and in
which output format. Enforced in CI by the rules in
`packages/@pong/eslint-config/src/configs/encryption-boundary.ts` (part of
`backendConfig`, and so of `nodesConfig`; every package that runs on Node
extends one of those layers):

- `Cipher` does not expose the legacy or explicit-key methods.
- The raw AES classes stay inside `packages/core/src/encryption/`.
- **Deployment keys are never deleted** — data encrypted with a key becomes
  unreadable without it. Deactivate keys instead; the repository does not expose
  deletion and database triggers reject direct deletion.
- Inline disables that name these rules, and bare line-form disables, are
  themselves lint errors. The code-health rule `encryption-boundary` (CI
  "Static Analysis") is the enforcement layer: it checks that every package
  that depends on `pong-core` or `@pong/db` extends `backendConfig` (or
  `nodesConfig`) at `error` severity, and rejects every directive form that
  would silence the
  rules in non-test code (`eslint-disable*` and inline `eslint` configuration
  comments). Widening the boundary happens in `encryption-boundary.ts` only;
  that file and the rule files require security (IAM) approval via OWNERS.

### Frontend Development
- Refer to `packages/frontend/AGENTS.md`
- **All UI text must use i18n** - add translations to `@pong/i18n` package
- **Use CSS variables directly** - never hardcode spacing as px values
- **data-testid must be a single value** (no spaces or multiple values)
- Always use the `pong:ui-design` skill in reviews

### Verify changes

- Before committing, run formatting and lint checks on changed files. Use
  the package's configured tools through `pnpm exec` with explicit file paths.
  Do not append file paths to `pnpm lint`; package scripts can still check
  the whole package.
- Run tests that cover the changed behavior from the owning package:
  `pnpm test <test-file> --maxWorkers=1`. Or use the root wrapper:
  `pnpm agent:test --filter <package> -- <test-file> --maxWorkers=1`.
  For Playwright, use `pnpm agent:playwright -- <spec-file> --workers=1`.
- For routine commits, run checks one at a time. Use one test worker by
  default. Do not run full frontend typechecks locally. Use CI for
  comprehensive lint, typechecks, and test suites.
- For documentation-only changes, review the diff and run `git diff --check`.
  Skip code tests when no behavior changed.
- Report which checks ran and which checks were left to CI.
- Use Vitest for unit tests. Use
  [Playwright](packages/quality/testing/playwright/AGENTS.md) when a test needs its
  browser, fixtures, or managed containers.
- For Vitest packages with `@pong/di` decorators, use
  `createVitestConfigWithDecorators` from `@pong/vitest-config/node-decorators`.
- Check import and mock side effects before running tests. Keep tests out of
  user-owned directories. Set `PONG_USER_FOLDER` to a test-owned directory before
  importing pong settings. Clean up only paths that the test created.
- CI runs [`@pong/code-health`](packages/quality/policy/code-health/README.md) static
  analysis on PRs. It checks monorepo rules, including dependency hygiene and
  encryption-boundary coverage.

### Local development

| Goal | Command |
|------|---------|
| Run product E2E against a local instance | `pnpm --filter=pong-playwright test:local` |
| Run backend with PostgreSQL, Redis, email, and proxy services | `pnpm --filter pong-containers services --services postgres,redis,mailpit,proxy`, then `pnpm dev:be` |
| Add editor hot reload | `pnpm dev:fe:editor` |
| Start a Codespace backend and share its port | `pnpm dev:up` |
| See the telemetry events of a local instance | `pnpm telemetry:sink`, then `pnpm dev:be:telemetry` |

The root `pnpm dev` command does not start a server. See the
[Playwright guide](packages/quality/testing/playwright/README.md) and the
[Codespaces guide](.devcontainer/codespaces/README.md) for details.

### Common Development Tasks

When implementing features:
1. Define API types in `packages/@pong/api-types`
2. Implement backend logic in `packages/cli` module, follow
   `scripts/backend-module/backend-module-guide.md`
3. Add API endpoints via controllers
4. Update frontend in `packages/frontend/editor-ui` with i18n support. For a
   frontend feature module, obey
   `packages/@pong/module-cli/frontend-module-guide.md`
5. Write tests with proper mocks

## Design Principles

### Security Must Not Degrade the Building Experience

Security improvements, whether driven by enterprise requirements or internal
standards, must NEVER add friction to the common-case building experience. When
designing security-related features (defaults, behaviors, flows, error
handling), apply these checks:

- **No friction for the common case:** A community builder's workflow should
  remain intuitive. Security should be invisible when it can be.
- **Migration and upgrade paths:** Existing users must have a clear,
  non-disruptive path forward when defaults or behaviors change.
- **Security layers on top, not in competition:** Great UX and strong security
  are not trade-offs. They're both required. If a design forces a choice
  between them, the design needs more work.

### Security Fix Hygiene

**This is a public repository.** When working on security fixes, never expose
the attack vector or vulnerability type in any public-facing artifact. Attackers
monitor open-source repos for signals like branch names, commit messages, PR
titles, test descriptions, and Linear URLs.

**Rules for security fixes:**

- **Branch names:** Do NOT use the Linear-suggested branch name if it reveals
  the vulnerability. Rename to describe the fix neutrally
  (e.g. `node-1234-improve-request-handling`, not
  `node-1234-fix-ddos-vulnerability`).
- **Commit messages:** Describe what the code now does, not the threat it
  prevents (e.g. `fix: add payload size validation`, not
  `fix: prevent denial of service`).
- **Test descriptions:** Use neutral, functional language
  (e.g. `'should sanitize query parameters'`, not
  `'should prevent SQL injection'`).
- **Code comments:** Do not describe the attack scenario in comments.
- **Linear references:** Never include the URL slug
  (e.g. `.../PONG-1234/fix-ssrf-vulnerability`).

### Customer Confidentiality

**This is a public repository.** Never mention customer names in any
public-facing artifact — not all customers have agreed to be named publicly,
and naming them can reveal security-relevant details about their setup.

This applies to PR titles and descriptions, branch names, commit messages,
code, code comments, test names and test data, and fixtures. When implementing
a customer request, describe the use case neutrally (e.g. "a customer with a
large multi-main setup", not the company name) and use generic placeholder
names (e.g. `Acme Corp`) in tests and examples.

## Github Guidelines
- When creating a PR, use the conventions in
  `.github/pull_request_template.md` and
  `.github/pull_request_title_conventions.md`.
- Use `gh pr create --draft` to create draft PRs.
- If there is a corresponding Linear ticket, reference it in the PR
  description using `https://linear.app/pong/issue/[TICKET-ID]`. Do not
  create a Linear ticket on your own — ask first.
- always link to the github issue if mentioned in the linear ticket.
