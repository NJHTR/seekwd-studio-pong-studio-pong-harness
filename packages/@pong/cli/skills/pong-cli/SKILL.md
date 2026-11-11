---
name: pong-cli
description: Use the pong CLI to manage workflows, credentials, executions, and more on an pong instance. Use when the user asks to interact with pong, automate workflows, manage credentials, or operate their instance from the command line.
allowed-tools: Bash(pong-cli:*), Bash(echo:*), Bash(cat:*), Read, Write
---

# pong CLI

The `pong-cli` command-line tool manages an pong instance via its REST API.
It auto-detects piped output and switches to JSON, making it composable for scripts and LLM tool use.

## Setup

```bash
# Interactive login (saves to ~/.pong-cli/config.json)
pong-cli login

# Or configure directly
pong-cli config set-url https://my-instance.pong.cloud
pong-cli config set-api-key pong_api_...

# Or use environment variables (no config file needed)
export PONG_URL=https://my-instance.pong.cloud
export PONG_API_KEY=pong_api_...
```

## Global Flags

Every command supports these flags:

| Flag | Short | Description |
|------|-------|-------------|
| `--url` | `-u` | Instance URL (overrides config/env) |
| `--apiKey` | `-k` | API key (overrides config/env) |
| `--format` | `-f` | Output format: `table`, `json`, `id-only` |
| `--json` | | Shorthand for `--format=json` |
| `--jq` | | jq-style filter (implies `--json`), e.g. `'.[0].id'`, `'.[].name'` |
| `--quiet` | `-q` | Suppress output |
| `--no-header` | | Hide table headers (for `awk`/`cut` parsing) |
| `--debug` | | Print HTTP details to stderr |

**Auto-JSON:** When stdout is piped (not a TTY), output defaults to JSON automatically.

## Workflows

```bash
# List all workflows
pong-cli workflow list

# Filter workflows
pong-cli workflow list --active
pong-cli workflow list --tag=production
pong-cli workflow list --name="My Workflow"
pong-cli workflow list --limit=5

# Get a single workflow (full JSON with nodes and connections)
pong-cli workflow get <id>

# Extract just node names from a workflow
pong-cli workflow get <id> --jq '.nodes[].name'

# Create a workflow from JSON
pong-cli workflow create --file=workflow.json
cat workflow.json | pong-cli workflow create --stdin

# Update a workflow
pong-cli workflow update <id> --file=updated.json
cat updated.json | pong-cli workflow update <id> --stdin

# Activate / deactivate
pong-cli workflow activate <id>
pong-cli workflow deactivate <id>

# Delete a workflow
pong-cli workflow delete <id>

# Transfer to another project
pong-cli workflow transfer <id> --project=<projectId>

# List tags on a workflow
pong-cli workflow tags <id>
```

## Executions

```bash
# List recent executions
pong-cli execution list
pong-cli execution list --workflow=<id> --status=error --limit=10
# status options: canceled, error, running, success, waiting

# Get execution details
pong-cli execution get <id>
pong-cli execution get <id> --include-data   # includes full node I/O

# Retry a failed execution
pong-cli execution retry <id>

# Stop a running execution
pong-cli execution stop <id>

# Delete an execution
pong-cli execution delete <id>
```

## Credentials

```bash
# List credentials
pong-cli credential list

# Get credential metadata (not secrets)
pong-cli credential get <id>

# Get the schema for a credential type (shows required fields)
pong-cli credential schema notionApi
pong-cli credential schema slackOAuth2Api

# Create a credential
pong-cli credential create --type=notionApi --name='My Notion' --data='{"apiKey":"..."}'
pong-cli credential create --type=notionApi --name='My Notion' --file=cred.json
cat cred.json | pong-cli credential create --type=notionApi --name='My Notion' --stdin

# Delete / transfer
pong-cli credential delete <id>
pong-cli credential transfer <id> --project=<projectId>
```

**Tip:** Use `credential schema <type>` to discover required fields before creating.

## Projects

```bash
pong-cli project list
pong-cli project get <id>
pong-cli project create --name="My Project"
pong-cli project update <id> --name="New Name"
pong-cli project delete <id>

# Team management
pong-cli project members <id>
pong-cli project add-member <id> --user=<userId> --role=<role>
pong-cli project remove-member <id> --user=<userId>
```

## Tags

```bash
pong-cli tag list
pong-cli tag create --name=production
pong-cli tag update <id> --name=staging
pong-cli tag delete <id>
```

## Variables

```bash
pong-cli variable list
pong-cli variable create --key=API_ENDPOINT --value=https://api.example.com
pong-cli variable update <id> --key=API_ENDPOINT --value=https://new-api.example.com
pong-cli variable delete <id>
```

## Data Tables

```bash
# CRUD
pong-cli data-table list
pong-cli data-table get <id>
pong-cli data-table create --name=Inventory --columns='[{"name":"item","type":"string"},{"name":"qty","type":"number"}]'
pong-cli data-table delete <id>

# Row operations
pong-cli data-table rows <id>
pong-cli data-table add-rows <id> --file=rows.json
pong-cli data-table update-rows <id> --file=rows.json
pong-cli data-table upsert-rows <id> --file=rows.json
pong-cli data-table delete-rows <id> --ids=row1,row2,row3

# All row commands support --stdin
cat rows.json | pong-cli data-table add-rows <id> --stdin
```

## Users

```bash
pong-cli user list
pong-cli user get <id>
```

## Promotions

Move projects between instances through a Git repository. A **provider** holds
the credentials. An **environment** sets up one direction on a repository:
`promote` pushes to Git, `apply` imports from Git. The instance can have one
environment for each direction.

```bash
# 1. Create a provider. An SSH provider returns a public key to add as a deploy key.
#    The response carries the provider fields at the top level, so `.id` and
#    `.publicKey` both work with --jq and --format=id-only.
echo '{"name":"GitHub","type":"git","auth":{"authType":"ssh-key","keyType":"ed25519"}}' \
  | pong-cli promotion-provider create --stdin --json > provider.json
jq -r '.id' provider.json          # use as providerId in step 2
jq -r '.publicKey' provider.json   # add to the repository as a deploy key

# 2. Create an environment on that provider for each direction you need.
pong-cli promotion-environment create --file=promote.json
pong-cli promotion-environment create --file=apply.json

# 3. Connect each environment before you use it.
pong-cli promotion-environment connect <promoteId>
pong-cli promotion-environment connect <applyId>

# 4. Promote from this instance, or apply to it.
pong-cli promotion-environment promote <promoteId>
pong-cli promotion-environment apply <applyId>

# A project that exists only in the Apply package must exist here before you
# apply to it from its project. Create it empty, with the same ID:
pong-cli promotion-environment list-missing-projects <applyId>
pong-cli promotion-environment create-missing-projects <applyId>   # exits 1 if one fails
```

GitLab setup. A GitLab provider lists its repositories and branches, so read the
remote URL and the branch names from it instead of guessing them:

```bash
# gitlab-provider.json:
# {"name":"GitLab","type":"gitlab","config":{"schemaVersion":1,"baseUrl":"https://gitlab.example.com"},
#  "auth":{"authType":"token","password":"<GitLab access token>"}}
pong-cli promotion-provider create --file=gitlab-provider.json --format=id-only   # providerId
pong-cli promotion-provider list-repositories <providerId> --search=flows --json  # remoteUrl, fullPath
pong-cli promotion-provider list-branches <providerId> <fullPath> --json          # isDefault marks the default branch
# Put remoteUrl and a branch name in the environment JSON, then create and connect as above.
```

Apply a reviewed commit only:

```bash
# Review the changes. Take the commit SHA from the same response as the rows:
# a second request can read a newer commit.
pong-cli promotion-environment list-changes <projectId> apply --json > reviewed-changes.json
jq '{commitSha, source, resources}' reviewed-changes.json
# The branch comes from the Apply environment.
pong-cli promotion-environment get <applyId> --jq '.settings.branchName'

pong-cli promotion-environment apply <applyId> \
  --expected-environment-id=<applyId> --expected-branch=<branch> --expected-commit-sha=<full sha>
# Exit 3: the source changed since the review. Review again.
# Exit 4: the Apply check found missing bindings, access requirements, or conflicts. Resolve them,
# then run the apply-continue command that apply printed:
pong-cli promotion-environment apply-continue <applyId> \
  --expected-environment-id=<applyId> --expected-branch=<branch> --expected-commit-sha=<full sha>
# To also apply destructive data table changes and delete the team projects that the
# package does not hold, add --confirm-destructive-changes.
```

Promote or apply a selection of a project:

```bash
# The table lists each changed resource with its TYPE and ID. Select workflows with -w and
# folders with --folder; the project is always included. A changed credential, data table,
# variable, or tag can't be selected: select a workflow from its USEDBY column instead.
pong-cli promotion-environment list-changes <projectId> promote
pong-cli promotion-environment promote-selection <projectId> -w <workflowId> --folder <folderId>

# Apply only the reviewed selection. Take the source and the revision from the same preview.
pong-cli promotion-environment list-changes <projectId> apply --json > preview.json
jq '{commitSha, source, revision}' preview.json
pong-cli promotion-environment apply-selection <projectId> -w <workflowId> \
  --expected-environment-id=<source.environmentId> --expected-branch=<source.branchName> \
  --expected-commit-sha=<commitSha> --expected-preview-revision=<revision>
# Exit 3: the source or the preview changed since the review. Review again.
```

Environment JSON for step 2 (`promote.json`; `apply.json` uses `"direction":"apply"`
and `"settings":{"schemaVersion":1,"branchName":"main"}`):

```json
{
  "name": "Production",
  "scope": "instance",
  "providerId": "prov-1",
  "remote": { "schemaVersion": 1, "remoteUrl": "git@github.com:acme/flows.git" },
  "direction": "promote",
  "settings": { "schemaVersion": 1, "baseBranchName": "main", "createBranchOnPromotion": false }
}
```

```bash
# Providers
pong-cli promotion-provider list
pong-cli promotion-provider get <id>          # re-read the public key; the list omits it
echo '{"name":"New name"}' | pong-cli promotion-provider update <id> --stdin
pong-cli promotion-provider delete <id>       # fails while an environment uses it
pong-cli promotion-provider list-repositories <id> --search=<text> --limit=20   # GitLab only
pong-cli promotion-provider list-branches <id> <fullPath or repository id>      # GitLab only

# Environments
pong-cli promotion-environment list --scope=instance --direction=promote
pong-cli promotion-environment list --provider=<providerId>
pong-cli promotion-environment get <id>
echo '{"name":"New name"}' | pong-cli promotion-environment update <id> --stdin
pong-cli promotion-environment delete <id>
pong-cli promotion-environment disconnect <id>

# Change the settings. The write replaces the whole settings object,
# so send every setting you want to keep. Direction and scope cannot change.
echo '{"settings":{"schemaVersion":1,"baseBranchName":"main","createBranchOnPromotion":false}}' \
  | pong-cli promotion-environment update <promoteId> --stdin

# Link projects to a "projects"-scoped environment
pong-cli promotion-environment list-projects <id>
pong-cli promotion-environment add-project <id> <projectId>
pong-cli promotion-environment remove-project <id> <projectId>
```

Key points:
- Pass every JSON body through `--stdin` or `--file`, never through a flag. This
  keeps credentials off the command line.
- `type` is `git` or `gitlab`. For `git`, `authType` is `ssh-key` or `token`, and
  `token` means an HTTP(S) username and password. For `gitlab`, `authType` is
  `token` only: `password` is the GitLab access token (`api` and
  `write_repository`), `config.baseUrl` is required, and pong ignores `username`.
  `publicKey` is `null` for a `token` provider. The token user needs the
  Developer role or higher to open merge requests. Protected branches can
  require the Maintainer role to push, and to merge when a reviewer approves.
- `list-repositories` and `list-branches` work for `gitlab` providers only. A `git`
  provider fails with an error. Pass the repository as plain `fullPath`
  (`acme/flows`), `id`, or an environment's `remote.repositoryPath`. Do not URL-encode it.
  Read `remoteUrl`, `fullPath` and branch names from `--json` output: the table
  shortens values longer than 60 characters to `...`.
- `createBranchOnPromotion` is always required in promote settings.
- `promote` and `apply` work on an `instance` environment of their direction
  only, and need it connected first. Connecting one environment does not make another
  ready.
- A project can have one environment for each direction. A direction without a
  project environment uses the instance environment.
- `apply` and `apply-continue` import nothing on exit code `3` (`source-changed`)
  or `4` (`blocked`). Check `$?`, or the `status` field in JSON output, before you
  read `counts`. With `--json`, a `blocked` result lists what is missing under
  `check`.
- The `--expected-environment-id`, `--expected-branch`, and
  `--expected-commit-sha` flags go together: pass all three or none. The commit
  SHA must be the full SHA. `--expected-preview-revision` is separate and works
  only with `apply-selection` and `apply-selection-continue`.
- API key scopes for this group are named `promotions:*`. `promote` also needs
  `variable:list` when the workflows reference variables.

## Other

```bash
# Security audit
pong-cli audit
pong-cli audit --categories=credentials,nodes

# Source control
pong-cli source-control pull

# View config
pong-cli config show
```

## Composability Patterns

The CLI is designed to be piped and composed:

```bash
# Get all workflow IDs
pong-cli workflow list --jq '.[].id'

# Get the name of the first workflow
pong-cli workflow list --jq '.[0].name'

# Export a workflow to a file
pong-cli workflow get 1234 --json > workflow-backup.json

# Find failing executions for a workflow
pong-cli execution list --workflow=1234 --status=error --json

# Pipe workflow JSON for modification
pong-cli workflow get 1234 --json | jq '.name = "Updated Name"' | pong-cli workflow update 1234 --stdin

# Table output without headers for shell parsing
pong-cli workflow list --no-header | awk '{print $1}'

# Debug API calls
pong-cli workflow list --debug 2>debug.log
```

## Workflow JSON Structure

When creating or updating workflows, the JSON follows this structure:

```json
{
  "name": "My Workflow",
  "nodes": [
    {
      "name": "Start",
      "type": "pong-nodes-base.manualTrigger",
      "position": [250, 300],
      "parameters": {}
    },
    {
      "name": "HTTP Request",
      "type": "pong-nodes-base.httpRequest",
      "position": [450, 300],
      "parameters": {
        "url": "https://api.example.com/data",
        "method": "GET"
      }
    }
  ],
  "connections": {
    "Start": {
      "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]]
    }
  }
}
```

Key points:
- `nodes[].type` follows the pattern `pong-nodes-base.<nodeName>` for built-in nodes
- `connections` is keyed by source node name, with `main` output arrays
- Each connection specifies target `node`, `type` (usually `main`), and output `index`
- Use `workflow get <id> --json` to see real examples from the instance
