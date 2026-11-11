# Disallow unresolved template placeholders in package.json (`@pong/community-nodes/no-template-placeholders`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Community node packages are typically scaffolded from a starter template that contains
placeholder values such as `<PACKAGE_NAME>`, `<USERNAME>`, or `{{ authorName }}`. When
these placeholders survive into a published `package.json`, the package metadata is
broken — the name is invalid, the repository link is dead, etc.

This rule scans every string value in `package.json` and reports any value containing
an unresolved placeholder pattern. It catches:

- Angle bracket placeholders: `<...>`
- Mustache placeholders: `{{...}}`

The rule applies to **all** string fields, including custom ones — not just the well-known
fields like `name`, `description`, `homepage`, or `repository.url`.

## Examples

### Incorrect

```json
{
  "name": "pong-nodes-<PACKAGE_NAME>",
  "description": "An pong community node for {{service}}",
  "homepage": "https://github.com/<USERNAME>/pong-nodes-example#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<USERNAME>/pong-nodes-example.git"
  }
}
```

### Correct

```json
{
  "name": "pong-nodes-acme",
  "description": "An pong community node for the Acme API",
  "homepage": "https://github.com/acme/pong-nodes-acme#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/acme/pong-nodes-acme.git"
  }
}
```
