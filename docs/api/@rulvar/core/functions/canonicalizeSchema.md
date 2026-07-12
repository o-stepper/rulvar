[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / canonicalizeSchema

# Function: canonicalizeSchema()

```ts
function canonicalizeSchema(schema): JsonSchema;
```

Defined in: [packages/core/src/l0/schema.ts:308](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L308)

Canonical schema derivation: local fragment-only $ref inlined (recursion is
a ConfigError), remote and dynamic references forbidden, annotation
keywords stripped (format retained), reference infrastructure ($defs,
definitions, $anchor) removed once inlined. The result feeds JCS
serialization and sha256.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | [`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md) |

## Returns

[`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md)
