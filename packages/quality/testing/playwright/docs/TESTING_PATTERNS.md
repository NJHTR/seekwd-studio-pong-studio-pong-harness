# Write an isolated Playwright test

Use the [suite map](../README.md#choose-a-suite) to select a project before you add a test. Use Playwright when you need a browser, its worker lifecycle, or managed services. Use Vitest for browser-free unit tests.

## Start a UI journey

Use `pong.start.*` so the page finishes loading before the test interacts with it. Create test data with API helpers when needed.

```typescript
test('opens a blank canvas', async ({ pong }) => {
	await pong.start.fromBlankCanvas();
	await expect(pong.canvas.canvasPane()).toBeVisible();
});
```

Use `nanoid()` for parallel-safe test names. Assert by identity instead of list count. Use page objects for selectors.

## Act as another user

Create the user through the API. Use `pong.start.withUser(user)` to get an isolated browser context. Use `api.createApiForUser(user)` when the test needs only an API context.

```typescript
const member = await api.publicApi.createUser({ role: 'global:member' });
const memberPong = await pong.start.withUser(member);
await memberPong.navigate.toWorkflows();
```

## Configure an isolated environment

Set `test.use()` at file scope. Give `TEST_ISOLATION` a unique value when tests need a fresh database.

```typescript
test.use({ capability: { env: { TEST_ISOLATION: 'my-feature' } } });
```

Add `@db:reset` to a describe block when each test must reset the database. This reset works only in container mode. See [Playwright fixtures](../fixtures/capabilities.ts) for available capabilities.

## Set a feature override

Use `TestRequirements` to put experiment overrides in test storage:

```typescript
const requirements: TestRequirements = {
	storage: { PONG_EXPERIMENT_OVERRIDES: JSON.stringify({ 'my_experiment': true }) },
};
test.use({ requirements });
```

The `pong` fixture enables project features. For an API-only test, call `api.enableProjectFeatures()` when required. See the [test requirements type](../Types.ts) for other overrides.

## Verify an existing journey after a refactor

Read the old test name and its assertion. Keep an assertion that proves the same behavior. Run the changed spec, then run `pnpm --filter pong-playwright janitor` to check test architecture. See the [test migration guide](https://www.notion.so/pong/Best-Practices-Test-Migration-Refactoring) for more cases.
