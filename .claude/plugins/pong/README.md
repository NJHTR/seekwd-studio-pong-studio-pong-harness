# pong Claude Code Plugin

Shared commands and agents for pong development, plus Claude Code skill links.
All plugin items are namespaced under `pong:` to avoid collisions with personal
or third-party plugins.

## Usage

Skills, commands, and agents are auto-discovered by Claude Code from this
plugin directory. Everything gets the `pong:` namespace prefix automatically.

| Type | Example | Invocation |
|------|---------|------------|
| Skill | `skills/create-pr/SKILL.md` | `pong:create-pr` |
| Command | `commands/plan.md` | `/pong:plan PAY-XXX` |
| Agent | `agents/developer.md` | `pong:developer` |

Shared skill sources live in `.agents/skills/`. Most entries under
`.claude/plugins/pong/skills/` are symlinks to those shared sources. Claude-only
skills or overrides remain real directories in this plugin path.

> **Requires symlink support.** These shared-skill entries are git symlinks. On
> Windows, check out with symlinks enabled (`git config core.symlinks true`,
> plus Developer Mode or WSL) — otherwise git writes them as plain text stubs
> and Claude Code fails to load the affected skills. `node
> scripts/sync-agent-skill-links.mjs --check` flags stubs with an actionable
> error.

## Plugin Structure

```
pong/                                # Marketplace root
├── .claude-plugin/
│   └── marketplace.json            # Lists the plugin at ./.claude/plugins/pong
├── .agents/skills/<shared>/        # Shared skills (real files)
└── .claude/plugins/pong/            # Plugin root
    ├── .claude-plugin/
    │   └── plugin.json             # Plugin identity
    ├── agents/
    │   └── <name>.md               # → pong:<name> agent
    ├── commands/
    │   └── <name>.md               # → /pong:<name> command
    ├── skills/
    │   ├── <shared> -> ../../../../.agents/skills/<shared>
    │   └── <claude-only>/SKILL.md
    └── README.md
```

The marketplace root and the plugin root are different directories. Claude
Code loads a symlinked file only if it resolves inside one of them. The shared
skill links resolve to `.agents/skills`, so the marketplace root must be the
repo root.

Run `pnpm sync:skill-links` after adding or removing shared skills. Run
`pnpm check:skill-links` before submitting changes.

## Design Decisions

### Why a plugin instead of standalone skills?

To get the `pong:` namespace prefix, avoiding collisions with personal or
third-party plugins. Claude Code only supports colon-namespaced items through
the plugin system — standalone `.claude/skills/` entries cannot be namespaced.

### Skill Frontmatter

Shared skills keep `name: pong:<name>` in `SKILL.md` frontmatter for cross-agent
discovery. Do not remove shared skill names when linking them into this plugin.
