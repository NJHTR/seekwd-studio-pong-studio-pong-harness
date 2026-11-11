# Enforce consistency between pong.aiNodeSdkVersion and ai-node-sdk peer dependency in community node packages (`@pong/community-nodes/ai-node-package-json`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Enforces consistency between `pong.aiNodeSdkVersion` in `package.json` and the `ai-node-sdk` peer dependency. When a community node uses the AI Node SDK, both fields must be present and correct.

The rule checks four conditions:

- `aiNodeSdkVersion` is declared inside the `pong` section (not at the root level)
- `aiNodeSdkVersion` is a positive integer
- If `pong.aiNodeSdkVersion` is set, `ai-node-sdk` must appear in `peerDependencies`
- If `ai-node-sdk` is in `peerDependencies`, `pong.aiNodeSdkVersion` must be set

## Examples

### ❌ Incorrect

```json
{
  "name": "pong-nodes-my-ai-node",
  "pong": {
    "aiNodeSdkVersion": "1"
  }
}
```

```json
{
  "name": "pong-nodes-my-ai-node",
  "aiNodeSdkVersion": 1,
  "peerDependencies": {
    "ai-node-sdk": "*"
  }
}
```

```json
{
  "name": "pong-nodes-my-ai-node",
  "peerDependencies": {
    "ai-node-sdk": "*"
  }
}
```

### ✅ Correct

```json
{
  "name": "pong-nodes-my-ai-node",
  "pong": {
    "aiNodeSdkVersion": 1
  },
  "peerDependencies": {
    "ai-node-sdk": "*"
  }
}
```
