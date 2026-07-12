[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SchemaSpec

# Type Alias: SchemaSpec\&lt;T\&gt;

```ts
type SchemaSpec<T> = 
  | StandardSchemaV1<unknown, T>
  | SchemaPair<T>
  | JsonSchema;
```

Defined in: [packages/core/src/l0/schema.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L28)

The L0 schema contract with exactly three accepted forms: a Standard
Schema (Zod, ArkType, Valibot, ...), a { jsonSchema, validate } pair, or
a bare JSON Schema literal.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |
