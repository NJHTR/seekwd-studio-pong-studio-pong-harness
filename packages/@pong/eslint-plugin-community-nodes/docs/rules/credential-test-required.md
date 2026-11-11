# Ensure credentials have a credential test (`@pong/community-nodes/credential-test-required`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutPongCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Ensures that your credentials include a `test` method to validate user credentials. This helps users verify their credentials are working correctly.

## Examples

### ❌ Incorrect

```typescript
export class MyApiCredential implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
    },
  ];
  // Missing test method
}
```

### ✅ Correct

```typescript
export class MyApiCredential implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://api.myservice.com',
      url: '/user',
      method: 'GET',
    },
  };
}
```
