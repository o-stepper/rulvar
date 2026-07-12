[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / projectToJsonSchema

# Function: projectToJsonSchema()

```ts
function projectToJsonSchema(spec): JsonSchema;
```

Defined in: `packages/core/dist/index.d.ts`

Derives the JSON Schema of a SchemaSpec. Form 1 projects via the
StandardJSONSchemaV1 input() converter, target draft 2020-12 with
draft-07 fallback; a library without the projection is a typed
ConfigError at definition time, never at first call. Transforming
schemas therefore project their INPUT type. Forms 2 and 3 are taken
verbatim.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) |

## Returns

[`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md)
