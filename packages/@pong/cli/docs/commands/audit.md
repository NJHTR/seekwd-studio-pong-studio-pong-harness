# audit

Generate a security audit report for your pong instance.

## `audit`

```bash
pong-cli audit
pong-cli audit --categories=credentials,nodes
pong-cli audit --format=json
```

| Flag | Description |
|------|-------------|
| `--categories` | Comma-separated categories: `credentials`, `database`, `nodes`, `filesystem`, `instance` |

Returns a security report covering the selected categories (or all by default).
