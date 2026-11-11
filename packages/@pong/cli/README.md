# @pong/cli

> Client CLI for pong. Manage workflows, executions, credentials, and more from the terminal.

A lightweight, zero-dependency CLI that talks to any pong instance via its public API. Designed for humans, scripts, and AI coding agents alike.

## Installation

```bash
# Use directly with npx (zero install)
npx @pong/cli workflow list

# Or install globally
npm install -g @pong/cli
```

## Configuration

The CLI needs your pong instance URL and an API key.

### Config file (recommended)

```bash
pong-cli config set-url https://my-pong.app.pong.cloud
pong-cli config set-api-key pong_api_xxxxx
pong-cli config show
```

Configuration is saved to `~/.pong-cli/config.json` with restricted file permissions (`0600`).

### Environment variables

```bash
export PONG_URL=https://my-pong.app.pong.cloud
export PONG_API_KEY=pong_api_xxxxx
```

### Inline flags

```bash
pong-cli --url=https://my-pong.app.pong.cloud --api-key=pong_api_xxxxx workflow list
```

### Resolution order

1. Command-line flags (`--url`, `--api-key`)
2. Environment variables (`PONG_URL`, `PONG_API_KEY`)
3. Config file (`~/.pong-cli/config.json`)

## Commands

| Topic | Commands |
|-------|----------|
| `workflow` | `list`, `get`, `create`, `update`, `delete`, `activate`, `deactivate`, `tags`, `transfer` |
| `execution` | `list`, `get`, `retry`, `stop`, `delete` |
| `credential` | `list`, `get`, `schema`, `create`, `delete`, `transfer` |
| `project` | `list`, `get`, `create`, `update`, `delete`, `members`, `add-member`, `remove-member` |
| `tag` | `list`, `create`, `update`, `delete` |
| `variable` | `list`, `create`, `update`, `delete` |
| `data-table` | `list`, `get`, `create`, `delete`, `rows`, `add-rows`, `update-rows`, `upsert-rows`, `delete-rows` |
| `user` | `list`, `get` |
| `config` | `set-url`, `set-api-key`, `show` |
| `promotion-provider` | `list`, `get`, `create`, `update`, `delete`, `list-repositories`, `list-branches` |
| `promotion-environment` | `list`, `get`, `create`, `update`, `delete`, `connect`, `disconnect`, `list-changes`, `promote`, `promote-selection`, `apply`, `apply-continue`, `apply-selection`, `apply-selection-continue`, `list-projects`, `list-missing-projects`, `create-missing-projects`, `add-project`, `remove-project` |
| `source-control` | `pull` |
| `package` | `export`, `import` _(beta)_, `import-selection` _(beta)_ |
| `skill` | `install` |
| `audit` | _(top-level)_ |
| `login` / `logout` | _(top-level)_ |

Every command supports `--help` for detailed usage.

Use `package export --agent-id=<id>` to export Agents. Repeat `--agent-id` to
select several Agents, or combine it with `--workflow-id` and `--folder-id`.
Import the archive with `package import --file=<file.pongp>`. The shared
`--conflict-policy`, `--id-policy`, and `--publishing-policy` settings apply to
both Agents and workflows. `--conflict-policy` also applies to the skills of
imported Agents. Only `source` is supported for `--id-policy`.
See [package commands](docs/commands/package.md)
for scopes, defaults, and examples. Agent packages use the ordinary import command.

## Output formats

All commands support three output formats via `--format`:

| Format | Flag | Use case |
|--------|------|----------|
| Table | `--format=table` (default) | Human-readable terminal output |
| JSON | `--format=json` | Piping to `jq`, programmatic use |
| ID-only | `--format=id-only` | Piping to `xargs`, scripting |

```bash
# Human-readable table
pong-cli workflow list

# JSON for scripts
pong-cli workflow list --format=json | jq '.[] | select(.active) | .id'

# Pipe IDs into another command
pong-cli workflow list --format=id-only | xargs -I{} pong-cli workflow deactivate {}
```

## AI agent integration

The CLI ships with a skill file that teaches AI coding agents how to use it.

```bash
# Claude Code (project-level)
pong-cli skill install

# Claude Code (global)
pong-cli skill install --global

# Cursor
pong-cli skill install --target=cursor

# Windsurf
pong-cli skill install --target=windsurf
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Lint & typecheck
pnpm lint
pnpm typecheck
```

## License

See [LICENSE.md](LICENSE.md) for details.
