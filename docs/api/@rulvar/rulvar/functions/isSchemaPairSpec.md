[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / isSchemaPairSpec

# Function: isSchemaPairSpec()

```ts
function isSchemaPairSpec(spec): spec is SchemaPair<unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

Form-2 guard: an explicit { jsonSchema, validate } pair.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) |

## Returns

`spec is SchemaPair<unknown>`
