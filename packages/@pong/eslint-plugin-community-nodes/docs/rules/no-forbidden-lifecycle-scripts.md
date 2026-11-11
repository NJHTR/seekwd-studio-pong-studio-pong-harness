# Ban lifecycle scripts (prepare, preinstall, postinstall, etc.) in community node packages (`@pong/community-nodes/no-forbidden-lifecycle-scripts`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

npm lifecycle scripts (`prepare`, `preinstall`, `install`, `postinstall`, `prepublish`, `preprepare`, `postprepare`) run automatically — without user confirmation — during `npm install`. In the context of pong community nodes, this means arbitrary code executes on the pong instance the moment a community node is installed.

pong community nodes are distributed as pre-built npm packages. Unlike regular npm libraries, there is no legitimate reason for a community node to hook into install-time lifecycle events — the package should already contain compiled code ready to use. A `prepare` or `postinstall` script in a community node is either a misconfiguration (the author forgot to remove a build step meant for development) or a supply-chain attack vector.

## Examples

### Incorrect

```json
{
  "name": "pong-nodes-example",
  "scripts": {
    "prepare": "npm run build"
  }
}
```

```json
{
  "name": "pong-nodes-example",
  "scripts": {
    "build": "tsc",
    "postinstall": "node setup.js"
  }
}
```

### Correct

```json
{
  "name": "pong-nodes-example",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  }
}
```
