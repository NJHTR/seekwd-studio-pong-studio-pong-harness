# Using pong CLI in CI/CD Pipelines

The pong CLI is built for automation. Use it in GitHub Actions, GitLab CI, or any CI/CD system.

## GitHub Actions example

```yaml
name: Deploy Workflows
on:
  push:
    branches: [main]
    paths: ['workflows/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pong CLI
        run: npm install -g @pong/cli

      - name: Deploy workflows
        env:
          PONG_URL: ${{ secrets.PONG_URL }}
          PONG_API_KEY: ${{ secrets.PONG_API_KEY }}
        run: |
          for file in workflows/*.json; do
            name=$(jq -r '.name' "$file")
            echo "Deploying: $name"
            pong-cli workflow create --file="$file" --quiet
          done
```

## Environment variables

Set these in your CI environment:

| Variable | Description |
|----------|-------------|
| `PONG_URL` | Your pong instance URL |
| `PONG_API_KEY` | API key with appropriate permissions |

## Common CI/CD tasks

### Export workflows for version control

```bash
# Export all workflows as JSON files
for id in $(pong-cli workflow list --format=id-only); do
  pong-cli workflow get "$id" --format=json > "workflows/${id}.json"
done
```

### Validate workflows exist after deploy

```bash
pong-cli workflow list --format=json | jq 'length'
```

### Source control sync

```bash
pong-cli source-control pull --force
```

## Tips

- Use `--quiet` flag to suppress non-essential output in pipelines
- Use `--format=json` for reliable parsing with `jq`
- Use `--format=id-only` for piping to other commands
- Check exit codes (`$?`) for error handling in scripts
