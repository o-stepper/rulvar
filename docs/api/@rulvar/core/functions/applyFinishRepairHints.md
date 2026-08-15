[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / applyFinishRepairHints

# Function: applyFinishRepairHints()

```ts
function applyFinishRepairHints(text, hints): string | undefined;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:662](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L662)

Applies `insert-run-id` repair hints to a judged text (RV3801): each
`[start, end)` window is replaced by
[insertRunIdIntoSentence](/api/@rulvar/core/functions/insertRunIdIntoSentence.md)(window, insert), right to left so
earlier offsets stay valid, every other byte identical. Fail closed:
`undefined` (never a partial patch) when the set is empty, any
window is out of bounds or empty, or two windows overlap; the caller
treats a refused patch exactly like an absent one and proceeds to
the model repair pool.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |
| `hints` | readonly \{ `end`: `number`; `insert`: `string`; `start`: `number`; \}[] |

## Returns

`string` \| `undefined`
