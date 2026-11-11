# Enforce correct package naming convention for pong community nodes (`@pong/community-nodes/package-name-convention`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Validates that your package name follows the correct pong community node naming convention. Package names must start with `pong-nodes-` and can optionally be scoped.

The rule also requires a `name` field to be present and rejects the default placeholder (`pong-nodes-<...>`) that ships with the node starter template, so packages are not published with a missing or unfilled name.

## Examples

### ❌ Incorrect

```json
{
  "name": "my-service-integration"
}
```

```json
{
  "name": "nodes-my-service"
}
```

```json
{
  "name": "@company/my-service"
}
```

```json
{
  "name": "pong-nodes-<...>"
}
```

```json
{
  "version": "1.0.0"
}
```

### ✅ Correct

```json
{
  "name": "pong-nodes-my-service"
}
```

```json
{
  "name": "@company/pong-nodes-my-service"
}
```

## Best Practices

- Use descriptive service names: `pong-nodes-github` rather than `pong-nodes-api`
- For company packages, use your organization scope: `@mycompany/pong-nodes-internal-tool`
