[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / knowledgeHash

# Function: knowledgeHash()

```ts
function knowledgeHash(claims): string;
```

Defined in: [packages/core/src/knowledge/file-store.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/file-store.ts#L25)

Deterministic content hash of the claims array (JCS + sha256).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] |

## Returns

`string`
