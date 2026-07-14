[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SchemaValidationResult

# Type Alias: SchemaValidationResult\&lt;T\&gt;

```ts
type SchemaValidationResult<T> = 
  | {
  valid: true;
  value: T;
}
  | {
  issues: Issue[];
  valid: false;
};
```

Defined in: `packages/core/dist/index.d.ts`

Result of validating a value against a SchemaSpec.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |
