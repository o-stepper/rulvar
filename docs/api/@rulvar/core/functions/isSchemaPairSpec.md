[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / isSchemaPairSpec

# Function: isSchemaPairSpec()

```ts
function isSchemaPairSpec(spec): spec is SchemaPair<unknown>;
```

Defined in: [packages/core/src/l0/schema.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L56)

Form-2 guard: an explicit { jsonSchema, validate } pair.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) |

## Returns

`spec is SchemaPair<unknown>`
