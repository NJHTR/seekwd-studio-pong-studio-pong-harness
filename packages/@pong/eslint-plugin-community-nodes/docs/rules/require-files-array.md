# Require a non-empty "files" array in package.json (`@pong/community-nodes/require-files-array`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The `files` field in package.json controls which files are included when the
package is published to npm. Without it, every file in the package directory
gets published — including tests, source files, build artifacts, and config
files — bloating the published package and potentially leaking unintended
content.

Declaring an explicit, non-empty `files` array ensures only the intended files
(typically `dist` and any credential assets) are published.

## Examples

### Incorrect

```json
{
	"name": "pong-nodes-example",
	"version": "1.0.0"
}
```

```json
{
	"name": "pong-nodes-example",
	"files": []
}
```

### Correct

```json
{
	"name": "pong-nodes-example",
	"files": ["dist"]
}
```
