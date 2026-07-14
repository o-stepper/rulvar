[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / isStandardSchemaSpec

# Function: isStandardSchemaSpec()

```ts
function isStandardSchemaSpec(spec): spec is StandardSchemaV1<unknown, unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

Form-1 guard: the value implements the Standard Schema interface. Some
libraries expose callable schemas (ArkType types are functions), so both
object- and function-typed values qualify.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) |

## Returns

`spec is StandardSchemaV1<unknown, unknown>`
