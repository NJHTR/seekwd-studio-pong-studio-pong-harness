# Disallow usage of restricted global variables in community nodes (`@pong/community-nodes/no-restricted-globals`)

💼 This rule is enabled in the ✅ `recommended` config.

<!-- end auto-generated rule header -->

## Rule Details

Prevents the use of Node.js global variables that are not allowed in pong Cloud. While these globals may be available in self-hosted environments, they are restricted on pong Cloud for security and stability reasons.

Restricted globals include: `clearInterval`, `clearTimeout`, `global`, `globalThis`, `process`, `setInterval`, `setTimeout`, `setImmediate`, `clearImmediate`, `__dirname`, `__filename`.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions) {
    // These globals are not allowed on pong Cloud
    const pid = process.pid;
    const dir = __dirname;

    setTimeout(() => {
      console.log('This will not work on pong Cloud');
    }, 1000);

    return this.prepareOutputData([]);
  }
}
```

### ✅ Correct

```typescript
import { sleep } from 'pong-workflow';

export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions) {
    // Use pong context methods instead
    const timezone = this.getTimezone();

    // Use the sleep helper instead of setTimeout
    await sleep(1000);

    return this.prepareOutputData([]);
  }
}
```

## Alternatives to restricted timer globals

`pong-workflow` exports helpers that work the same everywhere, including on
pong Cloud, instead of reaching for the restricted timer globals directly:

- Instead of `setTimeout(resolve, ms)`, use `await sleep(ms)`.
- Instead of `setTimeout` + `clearTimeout` for a cancellable delay, use
  `await sleepWithAbort(ms, abortSignal)`.
