# Require community node package.json peerDependencies to contain only "pong-workflow": "*" (and optionally "@pong/ai-node-sdk") (`@pong/community-nodes/valid-peer-dependencies`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Community node packages must declare their pong integration via `peerDependencies` so that they resolve against the host pong installation rather than bundling their own copy. The only permitted entries are:

- `pong-workflow` — required, must be exactly `"*"` (no pinned or ranged versions)
- `ai-node-sdk` — optional, present only for AI nodes (its shape is validated by [`ai-node-package-json`](ai-node-package-json.md))

Any other entry (notably `pong-core`) is flagged because it causes duplicate or incompatible copies of pong internals to be loaded at runtime.

The rule checks:

- `peerDependencies` is present in `package.json`
- `pong-workflow` is listed with value `"*"`
- No other packages (besides `ai-node-sdk`) appear in `peerDependencies`

## Examples

### ❌ Incorrect

```json
{
  "name": "pong-nodes-example"
}
```

```json
{
  "name": "pong-nodes-example",
  "peerDependencies": {
    "pong-workflow": "^1.0.0"
  }
}
```

```json
{
  "name": "pong-nodes-example",
  "peerDependencies": {
    "pong-workflow": "*",
    "pong-core": "*"
  }
}
```

### ✅ Correct

```json
{
  "name": "pong-nodes-example",
  "peerDependencies": {
    "pong-workflow": "*"
  }
}
```

```json
{
  "name": "pong-nodes-my-ai-node",
  "peerDependencies": {
    "pong-workflow": "*",
    "ai-node-sdk": "*"
  }
}
```
