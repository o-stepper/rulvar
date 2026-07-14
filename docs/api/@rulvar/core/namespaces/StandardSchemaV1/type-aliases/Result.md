[**Rulvar API reference**](../../../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / [StandardSchemaV1](/api/@rulvar/core/namespaces/StandardSchemaV1/index.md) / Result

# Type Alias: Result\&lt;Output\&gt;

```ts
type Result<Output> = 
  | SuccessResult<Output>
  | FailureResult;
```

Defined in: [packages/core/src/vendor/standard-schema.d.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/vendor/standard-schema.d.ts#L56)

The result interface of the validate function.

## Type Parameters

| Type Parameter |
| ------ |
| `Output` |
