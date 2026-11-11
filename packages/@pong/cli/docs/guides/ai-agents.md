# Using pong CLI with AI Agents

The pong CLI is designed from the ground up to work with AI coding agents like Claude Code, Cursor, and Windsurf.

## Setup for AI agents

Add this single line to your `CLAUDE.md` (or equivalent agent config):

```
Use `pong-cli` to manage pong workflows, executions, and credentials.
Run `pong-cli --help` to see available commands.
```

That's it. AI agents understand CLI tools instinctively — `--help` teaches them everything.

## Why CLI over MCP or raw HTTP?

| Approach | Agent support | Composability | Overhead |
|----------|--------------|---------------|----------|
| CLI | Universal (every agent runs bash) | Pipes, `jq`, `grep`, `xargs` | Zero |
| MCP | Requires MCP support | None | Handshake, JSON-RPC |
| Raw `curl` | Universal but verbose | Manual JSON parsing | Auth headers, pagination |

## Common patterns for AI agents

### List active workflows and filter

```bash
pong-cli workflow list --active --format=json | jq '.[].name'
```

### Export a workflow to file

```bash
pong-cli workflow get 1234 --format=json > my-workflow.json
```

### Batch operations with xargs

```bash
# Deactivate all workflows
pong-cli workflow list --format=id-only | xargs -I{} pong-cli workflow deactivate {}

# Delete all failed executions
pong-cli execution list --status=error --format=id-only | xargs -I{} pong-cli execution delete {}
```

### Check execution status

```bash
pong-cli execution list --workflow=1234 --status=error --limit=5 --format=json
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Authentication failure |
| `3` | Promotion Apply: the source changed since the review. Nothing was imported |
| `4` | Promotion Apply: the Apply check found missing bindings, access requirements, or conflicts. Nothing was imported |

AI agents can branch on `$?` for error handling.

## Output conventions

- **Data goes to stdout** — clean for piping
- **Errors go to stderr** — don't contaminate data streams
- **`--quiet` flag** — suppress non-essential output for scripting
