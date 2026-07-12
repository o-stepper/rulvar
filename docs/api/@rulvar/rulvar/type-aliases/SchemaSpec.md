[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SchemaSpec

# Type Alias: SchemaSpec\&lt;T\&gt;

```ts
type SchemaSpec<T> = 
  | StandardSchemaV1<unknown, T>
  | SchemaPair<T>
  | JsonSchema;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The L0 schema contract with exactly three accepted forms: a Standard
Schema (Zod, ArkType, Valibot, ...), a { jsonSchema, validate } pair, or
a bare JSON Schema literal (docs/08, section "The three forms").

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |
