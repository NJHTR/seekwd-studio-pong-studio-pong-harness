# Disallow string literals in node description `inputs`/`outputs` — use `NodeConnectionTypes` enum instead (`@pong/community-nodes/node-connection-type-literal`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Using raw string literals like `'main'` in `inputs` and `outputs` is fragile: the values are not type-checked, and typos or renamed connection types will go undetected. The `NodeConnectionTypes` object from `pong-workflow` is the single source of truth and should always be used instead.

## Examples

### ❌ Incorrect

```typescript
import type { INodeType, INodeTypeDescription } from 'pong-workflow';

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    inputs: ['main'],
    outputs: ['main'],
    properties: [],
  };
}
```

### ✅ Correct

```typescript
import type { INodeType, INodeTypeDescription } from 'pong-workflow';
import { NodeConnectionTypes } from 'pong-workflow';

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    properties: [],
  };
}
```
