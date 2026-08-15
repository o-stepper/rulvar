[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / applyFinishRepairHints

# Function: applyFinishRepairHints()

```ts
function applyFinishRepairHints(text, hints): string | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Applies `insert-run-id` repair hints to a judged text (RV3801): each
`[start, end)` window is replaced by
[insertRunIdIntoSentence](/api/@rulvar/rulvar/functions/insertRunIdIntoSentence.md)(window, insert), right to left so
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
