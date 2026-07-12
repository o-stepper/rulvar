[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / isStrictCompatibleSchema

# Function: isStrictCompatibleSchema()

```ts
function isStrictCompatibleSchema(schema): boolean;
```

Defined in: [packages/core/src/model/caps.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/caps.ts#L26)

Strict-schema compatibility as both first-class providers define it:
every object node declares `additionalProperties: false` and lists every
property in `required` (docs/04, section 5.2). Boolean schemas and
non-object shapes are trivially compatible.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | `boolean` \| [`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md) |

## Returns

`boolean`
