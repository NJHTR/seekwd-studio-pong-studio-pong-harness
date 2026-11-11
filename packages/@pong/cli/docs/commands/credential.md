# credential

Manage pong credentials.

## `credential list`

List all credentials (metadata only, no secrets).

```bash
pong-cli credential list
pong-cli credential list --format=json
```

## `credential get`

Get credential metadata by ID (no secrets returned).

```bash
pong-cli credential get 42
```

## `credential schema`

Get the JSON schema for a credential type's data fields.

```bash
pong-cli credential schema notionApi
pong-cli credential schema slackOAuth2Api --format=json
```

## `credential create`

Create a new credential.

```bash
pong-cli credential create --type=notionApi --name="My Notion" --data='{"apiKey":"..."}'
```

| Flag | Description |
|------|-------------|
| `--type` | Credential type name (required) |
| `--name` | Display name (required) |
| `--data` | Credential data as JSON string (required) |

## `credential delete`

Delete a credential.

```bash
pong-cli credential delete 42
```

## `credential transfer`

Transfer a credential to another project.

```bash
pong-cli credential transfer 42 --project=proj-abc
```
