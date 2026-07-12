[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / schemaHash

# Function: schemaHash()

```ts
function schemaHash(schema): string;
```

Defined in: [packages/core/src/l0/schema.ts:329](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L329)

schemaHash = sha256(JCS(canonicalize(schema))). Accepts the derived JSON
Schema (or a boolean schema); pass undefined for "no schema declared".

## Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | \| `boolean` \| [`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md) \| `undefined` |

## Returns

`string`
