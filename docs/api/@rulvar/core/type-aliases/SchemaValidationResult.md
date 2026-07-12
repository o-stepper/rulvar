[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SchemaValidationResult

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

Defined in: [packages/core/src/l0/schema.ts:378](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L378)

Result of validating a value against a SchemaSpec.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |
