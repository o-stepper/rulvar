[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / remeasureQueue

# Function: remeasureQueue()

```ts
function remeasureQueue(claims, at): ModelClaim[];
```

Defined in: [packages/core/src/knowledge/decay.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L60)

The re-measurement queue:
expired eval-measured claims that are still ACTIVE. Just a status
filter: the next sweep re-measures these subjects; nothing archives
them (archiving would empty the queue and hide the decay).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] |
| `at` | `string` |

## Returns

[`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[]
