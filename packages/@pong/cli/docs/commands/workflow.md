# workflow

Manage pong workflows.

## `workflow list`

List workflows with optional filters.

```bash
pong-cli workflow list
pong-cli workflow list --active
pong-cli workflow list --tag=production
pong-cli workflow list --name="Email Campaign"
pong-cli workflow list --limit=10 --format=json
```

| Flag | Description |
|------|-------------|
| `--active` | Only show active workflows |
| `--tag` | Filter by tag name |
| `--name` | Filter by workflow name |
| `--limit` | Maximum number of results |

## `workflow get`

Get a specific workflow by ID.

```bash
pong-cli workflow get 1234
pong-cli workflow get 1234 --format=json > workflow.json
```

## `workflow create`

Create a workflow from a JSON file.

```bash
pong-cli workflow create --file=workflow.json
cat workflow.json | pong-cli workflow create --stdin
```

## `workflow update`

Update a workflow from a JSON file.

```bash
pong-cli workflow update 1234 --file=workflow.json
```

## `workflow delete`

Delete a workflow.

```bash
pong-cli workflow delete 1234
```

## `workflow activate`

Activate (publish) a workflow.

```bash
pong-cli workflow activate 1234
```

## `workflow deactivate`

Deactivate a workflow.

```bash
pong-cli workflow deactivate 1234
```

## `workflow tags`

Get or set tags on a workflow.

```bash
# Get tags
pong-cli workflow tags 1234

# Set tags (by tag IDs)
pong-cli workflow tags 1234 --set=tagId1,tagId2
```

## `workflow transfer`

Transfer a workflow to another project.

```bash
pong-cli workflow transfer 1234 --project=proj-abc
```
