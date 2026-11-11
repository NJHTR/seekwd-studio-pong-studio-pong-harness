![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# @pong/workflow-sdk

TypeScript SDK to create pong workflows as code. You describe a workflow with `workflow()`, `trigger()`, `node()` and `.to()`. The SDK converts the code to pong workflow JSON and validates it.

SDK code is a restricted subset of TypeScript. For the full reference (builder functions, language rules, patterns, and expressions), call the `get_workflow_sdk_reference` tool of the pong MCP server.

## Install

```sh
npm install @pong/workflow-sdk
```

## Example

```typescript
import { workflow, trigger, node } from '@pong/workflow-sdk';

const start = trigger({
  type: 'pong-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' },
});

const fetchPosts = node({
  type: 'pong-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Fetch Posts',
    parameters: { method: 'GET', url: 'https://api.example.com/posts' },
  },
});

export default workflow('example', 'Fetch posts').add(start).to(fetchPosts);
```

## Convert code to workflow JSON

pong reads SDK code with an AST interpreter. The code never runs. The interpreter does not accept `import` declarations, so remove the import line before you parse the code.

```typescript
import { parseWorkflowCodeToBuilder, validateWorkflowBuilder } from '@pong/workflow-sdk';

// `code` is the workflow code without its import line.
const builder = parseWorkflowCodeToBuilder(code);
const result = validateWorkflowBuilder(builder);
if (!result.ok) {
  console.error(result.blocking);
}
const workflowJson = builder.toJSON();
```
