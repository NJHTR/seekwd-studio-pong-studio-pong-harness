# source-control

Interact with pong's source control integration.

## `source-control pull`

Pull changes from the remote Git repository.

```bash
pong-cli source-control pull
pong-cli source-control pull --force
```

| Flag | Description |
|------|-------------|
| `--force` | Force pull, overwriting local changes |

Requires the Source Control feature to be licensed and connected to a Git remote.
