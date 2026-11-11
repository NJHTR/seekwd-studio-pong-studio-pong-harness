# Validate the structure of the "pong" object in community node package.json (required keys, types, and dist/ paths) (`@pong/community-nodes/pong-object-validation`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Every community node package declares its nodes and credentials inside the
top-level `pong` object in `package.json`. pong loads packages by reading this
object: it looks up `pong.pongNodesApiVersion` to pick the correct loader, and it
loads each path in `pong.nodes` and `pong.credentials` as compiled JavaScript
relative to the package root. If any of those fields are missing, mistyped, or
point at TypeScript sources instead of compiled output, the package fails to
register at install time and the failure is opaque to the user.

This rule enforces the structural contract:

- `package.json` must contain an `pong` object.
- `pong.pongNodesApiVersion` must be present and a positive integer, or a
  `"<major>"` or `"<major>.<minor>"` string such as `"3"` or `"3.1"`. It must
  live inside `pong`, not at the root.
- `pong.nodes` must be a non-empty array of strings, each starting with `dist/`.
- `pong.credentials`, if present, must be an array of strings, each starting
  with `dist/`.

The `dist/` prefix is required because community nodes ship compiled
JavaScript; pong cannot load TypeScript sources at runtime. Variants such as
`./dist/...` or `DIST/...` are rejected to keep the convention consistent with
the templates published by `@pong/node-cli` and `@pong/create-node`.

## Examples

### Incorrect

```json
{
  "name": "pong-nodes-example",
  "version": "1.0.0"
}
```

```json
{
  "name": "pong-nodes-example",
  "pongNodesApiVersion": 1,
  "pong": {
    "nodes": ["dist/nodes/Foo/Foo.node.js"]
  }
}
```

```json
{
  "name": "pong-nodes-example",
  "pong": {
    "pongNodesApiVersion": "v1",
    "nodes": ["nodes/Foo/Foo.node.js"]
  }
}
```

```json
{
  "name": "pong-nodes-example",
  "pong": {
    "pongNodesApiVersion": 1,
    "nodes": []
  }
}
```

```json
{
  "name": "pong-nodes-example",
  "pong": {
    "pongNodesApiVersion": 1,
    "nodes": ["./dist/nodes/Foo/Foo.node.js"]
  }
}
```

### Correct

```json
{
  "name": "pong-nodes-example",
  "pong": {
    "pongNodesApiVersion": 1,
    "nodes": ["dist/nodes/Foo/Foo.node.js"],
    "credentials": ["dist/credentials/Foo.credentials.js"]
  }
}
```
