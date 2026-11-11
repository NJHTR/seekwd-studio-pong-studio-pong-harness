# config

Manage CLI configuration (URL, API key).

## `config set-url`

Set the pong instance URL.

```bash
pong-cli config set-url https://my-pong.app.pong.cloud
pong-cli config set-url http://localhost:5678
```

## `config set-api-key`

Set the API key for authentication.

```bash
pong-cli config set-api-key pong_api_xxxxx
```

The API key is stored in `~/.pong-cli/config.json` with `0600` file permissions.

## `config show`

Show current configuration.

```bash
pong-cli config show
# URL:      https://my-pong.app.pong.cloud
# API Key:  pong_api_xxxx...xxxx
```

The API key is partially masked for security.
