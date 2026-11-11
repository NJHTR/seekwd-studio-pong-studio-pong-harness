# Getting Started

## Installation

```bash
# Use directly with npx (zero install)
npx @pong/cli workflow list

# Or install globally
npm install -g @pong/cli
```

## Configuration

The CLI needs two things: your pong instance URL and an API key.

### Option 1: Config file (recommended)

```bash
pong-cli config set-url https://my-pong.app.pong.cloud
pong-cli config set-api-key pong_api_xxxxx

# Verify
pong-cli config show
```

Configuration is saved to `~/.pong-cli/config.json` with restricted file permissions (`0600`).

### Option 2: Environment variables

```bash
export PONG_URL=https://my-pong.app.pong.cloud
export PONG_API_KEY=pong_api_xxxxx
```

### Option 3: Inline flags

```bash
pong-cli --url=https://my-pong.app.pong.cloud --api-key=pong_api_xxxxx workflow list
```

### Resolution order

The CLI resolves configuration in this priority order:

1. Command-line flags (`--url`, `--api-key`)
2. Environment variables (`PONG_URL`, `PONG_API_KEY`)
3. Config file (`~/.pong-cli/config.json`)

## Your first commands

```bash
# List all workflows
pong-cli workflow list

# Get a specific workflow as JSON
pong-cli workflow get 1234 --format=json

# List failed executions
pong-cli execution list --status=error --limit=5

# Create a tag
pong-cli tag create --name=production
```

## Output formats

Every command supports three output formats:

| Format | Flag | Use case |
|--------|------|----------|
| Table | `--format=table` (default) | Human-readable terminal display |
| JSON | `--format=json` | Piping to `jq`, programmatic use |
| ID-only | `--format=id-only` | Piping to `xargs`, scripting |

```bash
# Human reads a table
pong-cli workflow list

# AI agent or script gets JSON
pong-cli workflow list --format=json | jq '.[] | select(.active) | .id'

# Pipe IDs to deactivate all workflows
pong-cli workflow list --format=id-only | xargs -I{} pong-cli workflow deactivate {}
```

## AI agent skills

The CLI ships with a skill that teaches AI coding agents how to use `pong-cli`.

```bash
# Claude Code (installs to .claude/skills/pong-cli/ in the current project)
pong-cli skill install

# Claude Code (global — installs to ~/.claude/skills/pong-cli/)
pong-cli skill install --global

# Cursor (appends to .cursorrules)
pong-cli skill install --target=cursor

# Windsurf (appends to .windsurfrules)
pong-cli skill install --target=windsurf
```

Then use `/pong-cli` in Claude Code to load the skill.

## Getting help

Every command has built-in help:

```bash
pong-cli --help
pong-cli workflow --help
pong-cli workflow list --help
```
