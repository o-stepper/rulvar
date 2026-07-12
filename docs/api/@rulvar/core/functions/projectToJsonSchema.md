[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / projectToJsonSchema

# Function: projectToJsonSchema()

```ts
function projectToJsonSchema(spec): JsonSchema;
```

Defined in: [packages/core/src/l0/schema.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L73)

Derives the JSON Schema of a SchemaSpec. Form 1 projects via the
StandardJSONSchemaV1 input() converter, target draft 2020-12 with
draft-07 fallback; a library without the projection is a typed
ConfigError at definition time, never at first call. Transforming
schemas therefore project their INPUT type. Forms 2 and 3 are taken
verbatim.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) |

## Returns

[`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md)
