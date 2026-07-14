[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / remeasureQueue

# Function: remeasureQueue()

```ts
function remeasureQueue(claims, at): ModelClaim[];
```

Defined in: `packages/core/dist/index.d.ts`

The re-measurement queue:
expired eval-measured claims that are still ACTIVE. Just a status
filter: the next sweep re-measures these subjects; nothing archives
them (archiving would empty the queue and hide the decay).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[] |
| `at` | `string` |

## Returns

[`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[]
