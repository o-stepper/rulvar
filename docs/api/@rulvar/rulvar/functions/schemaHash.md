[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / schemaHash

# Function: schemaHash()

```ts
function schemaHash(schema): string;
```

Defined in: `packages/core/dist/index.d.ts`

schemaHash = sha256(JCS(canonicalize(schema))). Accepts the derived JSON
Schema (or a boolean schema); pass undefined for "no schema declared".

## Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | \| `boolean` \| [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) \| `undefined` |

## Returns

`string`
