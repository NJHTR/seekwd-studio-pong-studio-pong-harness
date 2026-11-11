# Disallow non-empty "dependencies" in community node package.json (`@pong/community-nodes/no-runtime-dependencies`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The `dependencies` field in `package.json` declares packages that are installed alongside the node at runtime. In the context of pong community nodes this is dangerous:

- Community nodes run inside the shared pong runtime alongside all other installed nodes. Any package listed in `dependencies` gets installed into that shared environment and can shadow or conflict with versions already used by pong or other nodes.
- Unlike application packages, community nodes should not own their runtime environment. Shared libraries must be declared in `peerDependencies` (so the host runtime supplies them) or bundled at build time into the published artifact.
- A non-empty `dependencies` section is a strong signal that the package was scaffolded from a generic Node.js template without adapting it to the pong community node model.

## Examples

### Incorrect

```json
{
  "name": "pong-nodes-example",
  "dependencies": {
    "axios": "1.0.0"
  }
}
```

```json
{
  "name": "pong-nodes-example",
  "dependencies": {
    "axios": "1.7.0",
    "fast-xml-parser": "4.4.0",
    "minimatch": "9.0.5"
  }
}
```

### Correct

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
  "name": "pong-nodes-example",
  "dependencies": {},
  "peerDependencies": {
    "pong-workflow": "*"
  }
}
```
