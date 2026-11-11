# Require pairedItem on INodeExecutionData objects in execute() methods to preserve item linking (`@pong/community-nodes/missing-paired-item`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Every `INodeExecutionData` object returned from `execute()` should include a `pairedItem` property. Without it, downstream nodes cannot trace data lineage and expressions like `$('NodeName').item` will silently fail.

The rule detects object literals with a `json` property but no `pairedItem` inside `execute()` methods of `INodeType` classes.

## Examples

### Incorrect

```typescript
class MyNode implements INodeType {
  async execute() {
    const items = this.getInputData();
    // Missing pairedItem
    return [items.map((item) => ({ json: item.json }))];
  }
}
```

```typescript
class MyNode implements INodeType {
  async execute() {
    const returnData: INodeExecutionData[] = [];
    // Missing pairedItem
    returnData.push({ json: { result: true } });
    return [returnData];
  }
}
```

### Correct

```typescript
class MyNode implements INodeType {
  async execute() {
    const items = this.getInputData();
    return [items.map((item, index) => ({ json: item.json, pairedItem: { item: index } }))];
  }
}
```

```typescript
class MyNode implements INodeType {
  async execute() {
    const returnData: INodeExecutionData[] = [];
    returnData.push({ json: { result: true }, pairedItem: { item: 0 } });
    return [returnData];
  }
}
```

## When to Disable

If your node intentionally does not support item linking (e.g. it aggregates all input items into a single output), you can suppress this rule:

```typescript
// eslint-disable-next-line @pong/community-nodes/missing-paired-item
returnData.push({ json: aggregatedResult });
```

## Further Reading

- [pong Paired Items Documentation](https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)
