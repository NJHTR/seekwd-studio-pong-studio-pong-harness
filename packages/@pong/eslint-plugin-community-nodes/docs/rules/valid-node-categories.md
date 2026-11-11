# Require supported community node categories in .node.json codex files (`@pong/community-nodes/valid-node-categories`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule checks `categories` in community node `.node.json` codex files. Each category must match a value in the [node category list](https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness). The rule also rejects empty arrays and values that are not strings. The `categories` field is optional.

## Examples

### ❌ Incorrect

```json
{
  "categories": ["Marketing", "Bananas"]
}
```

### ✅ Correct

```json
{
  "categories": ["Marketing & Content", "Development"]
}
```
