[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / isStrictCompatibleSchema

# Function: isStrictCompatibleSchema()

```ts
function isStrictCompatibleSchema(schema): boolean;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Strict-schema compatibility as both first-class providers define it:
every object node declares `additionalProperties: false` and lists every
property in `required` (docs/04, section 5.2). Boolean schemas and
non-object shapes are trivially compatible.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | \| `boolean` \| [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) |

## Returns

`boolean`
