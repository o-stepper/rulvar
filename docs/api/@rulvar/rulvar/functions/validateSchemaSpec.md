[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / validateSchemaSpec

# Function: validateSchemaSpec()

```ts
function validateSchemaSpec<S>(spec, value): Promise<SchemaValidationResult<Out<S>>>;
```

Defined in: `packages/core/dist/index.d.ts`

Runtime validation per form:
form 1 via the Standard Schema's own validate, form 2 via the pair's
type guard, form 3 via the vendored draft 2020-12 validator. The same
machinery backs the structured-output tiers of the Agent Runtime.

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt; |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | `S` |
| `value` | `unknown` |

## Returns

`Promise`\&lt;[`SchemaValidationResult`](/api/@rulvar/rulvar/type-aliases/SchemaValidationResult.md)\&lt;[`Out`](/api/@rulvar/rulvar/type-aliases/Out.md)\&lt;`S`\&gt;\&gt;\&gt;
