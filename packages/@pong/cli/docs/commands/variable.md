# variable

Manage pong environment variables.

## `variable list`

List all variables.

```bash
pong-cli variable list
```

## `variable create`

Create a variable.

```bash
pong-cli variable create --key=API_ENDPOINT --value=https://api.example.com
```

## `variable update`

Update a variable's value.

```bash
pong-cli variable update var-1 --key=API_ENDPOINT --value=https://new-api.example.com
```

## `variable delete`

Delete a variable.

```bash
pong-cli variable delete var-1
```
