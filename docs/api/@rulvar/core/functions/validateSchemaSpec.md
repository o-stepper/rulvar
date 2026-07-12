[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / validateSchemaSpec

# Function: validateSchemaSpec()

```ts
function validateSchemaSpec<S>(spec, value): Promise<SchemaValidationResult<Out<S>>>;
```

Defined in: [packages/core/src/l0/schema.ts:393](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L393)

Runtime validation per form:
form 1 via the Standard Schema's own validate, form 2 via the pair's
type guard, form 3 via the vendored draft 2020-12 validator. The same
machinery backs the structured-output tiers of the Agent Runtime.

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt; |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | `S` |
| `value` | `unknown` |

## Returns

`Promise`\&lt;[`SchemaValidationResult`](/api/@rulvar/core/type-aliases/SchemaValidationResult.md)\&lt;[`Out`](/api/@rulvar/core/type-aliases/Out.md)\&lt;`S`\&gt;\&gt;\&gt;
