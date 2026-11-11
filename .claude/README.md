# Claude Code Configuration

This directory contains shared Claude Code configuration for the pong team.

Agents and commands live under the `pong` plugin at `.claude/plugins/pong/` for
`pong:` namespacing. Shared skills are sourced from `.agents/skills/` and linked
into the plugin. See [plugin README](plugins/pong/README.md) for full details.

## Setup

### Linear MCP Server

The Linear MCP server uses OAuth authentication. To connect:

1. Start Claude Code in this repository
2. Run `/mcp` command
3. Click the Linear authentication link in your browser
4. Authorize with your Linear account

You only need to do this once per machine.

### Permissions

Configure tool permissions in your global Claude Code settings (`~/.claude/settings.json`), not in this repo. This allows each developer to customize their own approval preferences.

To auto-approve Linear MCP tools, add to your global settings:

```json
{
  "permissions": {
    "allow": [
      "mcp__linear-server__*"
    ]
  }
}
```

**Note:** For GitHub/git operations, we use `gh` CLI and `git` commands instead of GitHub MCP.

## Plugin

All skills, commands, and agents are auto-discovered from
`.claude/plugins/pong/`. They get the `pong:` namespace prefix automatically
(e.g. `pong:create-pr`, `/pong:plan`, `pong:developer`).

See [plugin README](plugins/pong/README.md) for structure and design decisions.
