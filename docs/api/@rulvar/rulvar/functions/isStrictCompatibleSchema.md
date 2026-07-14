[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / isStrictCompatibleSchema

# Function: isStrictCompatibleSchema()

```ts
function isStrictCompatibleSchema(schema): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

Strict-schema compatibility as both first-class providers define it:
every object node declares `additionalProperties: false` and lists every
property in `required`. Boolean schemas and
non-object shapes are trivially compatible.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | \| `boolean` \| [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) |

## Returns

`boolean`
