[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / canonicalizeSchema

# Function: canonicalizeSchema()

```ts
function canonicalizeSchema(schema): JsonSchema;
```

Defined in: `packages/core/dist/index.d.ts`

Canonical schema derivation: local fragment-only $ref inlined (recursion is
a ConfigError), remote and dynamic references forbidden, annotation
keywords stripped (format retained), reference infrastructure ($defs,
definitions, $anchor) removed once inlined. The result feeds JCS
serialization and sha256.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) |

## Returns

[`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md)
